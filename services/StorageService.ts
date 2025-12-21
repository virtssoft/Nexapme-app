
import { STORAGE_KEYS, INITIAL_STOCK } from '../constants';
import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, PMEEntry, LicenseInfo, View, SubCategory, Operation, Appointment, Quote } from '../types';

class StorageService {
  private currentCompanyId: string | null = localStorage.getItem('nexapme_active_id');

  private getGlobal<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  private setGlobal<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private getCompanyData<T>(key: string, defaultValue: T): T {
    if (!this.currentCompanyId) return defaultValue;
    const data = localStorage.getItem(`nexapme_${this.currentCompanyId}_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  }

  private setCompanyData<T>(key: string, data: T): void {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_${key}`, JSON.stringify(data));
  }

  setActiveCompany(id: string) {
    this.currentCompanyId = id;
    localStorage.setItem('nexapme_active_id', id);
  }

  getActiveCompanyId(): string | null {
    return this.currentCompanyId;
  }

  getPMEList(): PMEEntry[] {
    return this.getGlobal('nexapme_global_pme_list', []);
  }

  savePMEList(list: PMEEntry[]) {
    this.setGlobal('nexapme_global_pme_list', list);
  }

  registerNewPME(entry: PMEEntry) {
    const list = this.getPMEList();
    if (!list.find(p => p.idUnique === entry.idUnique)) {
      this.savePMEList([...list, entry]);
    }
  }

  validateLicense(key: string): LicenseInfo | null {
    // 1. Clé Admin Maîtresse
    if (key === 'nexaPME2025') {
      return { key, type: 'ADMIN', pmeName: 'ADMINISTRATION', idUnique: 'ADMIN' };
    }

    // 2. Clé Universelle Maîtresse (Illimitée)
    if (key === 'nexaUNN2025') {
      return { key, type: 'UNIVERSAL', pmeName: 'ENTREPRISE MAITRESSE', idUnique: 'MASTER_PME' };
    }

    // 3. Vérification de la période d'essai locale
    if (key === 'TRIAL_MODE') {
      let trialExpiry = localStorage.getItem('nexapme_trial_expiry');
      let trialId = localStorage.getItem('nexapme_trial_id');

      if (!trialExpiry) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        trialExpiry = expiry.toISOString();
        localStorage.setItem('nexapme_trial_expiry', trialExpiry);
      }

      if (new Date(trialExpiry) < new Date()) return null;

      if (!trialId) {
        trialId = 'TRIAL-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('nexapme_trial_id', trialId);
        
        // Enregistrement dans la liste globale pour l'admin
        this.registerNewPME({
          idUnique: trialId,
          name: "Compte Essai",
          owner: "Utilisateur Temporaire",
          licenseKey: "TRIAL",
          licenseType: "TRIAL",
          expiryDate: trialExpiry,
          createdAt: new Date().toISOString()
        });
      }

      return { 
        key: 'TRIAL', 
        type: 'TRIAL', 
        expiryDate: trialExpiry, 
        pmeName: 'MODE ESSAI', 
        idUnique: trialId 
      };
    }

    // 4. Clés clients enregistrées
    const pmeList = this.getPMEList();
    const pme = pmeList.find(p => p.licenseKey === key);
    if (pme) {
      if (pme.licenseType === 'NORMAL' && pme.expiryDate) {
        if (new Date(pme.expiryDate) < new Date()) return null;
      }
      return { 
        key: pme.licenseKey, 
        type: pme.licenseType, 
        expiryDate: pme.expiryDate, 
        pmeName: pme.name, 
        idUnique: pme.idUnique 
      };
    }
    return null;
  }

  getCompanyInfo(): CompanyConfig | null {
    return this.getCompanyData('config', null);
  }

  saveCompanyInfo(config: CompanyConfig) {
    this.setCompanyData('config', config);
  }

  getUsers(): UserProfile[] {
    return this.getCompanyData('users', []);
  }

  saveUsers(users: UserProfile[]) {
    this.setCompanyData('users', users);
  }

  getCurrentUser(): UserProfile | null {
    return this.getGlobal('nexapme_current_session', null);
  }

  setCurrentUser(user: UserProfile | null) {
    this.setGlobal('nexapme_current_session', user);
  }

  getSubCategories(): SubCategory[] {
    return this.getCompanyData('subcategories', []);
  }

  saveSubCategories(list: SubCategory[]): void {
    this.setCompanyData('subcategories', list);
  }

  getStock(): StockItem[] {
    return this.getCompanyData('stock', INITIAL_STOCK);
  }

  updateStock(stock: StockItem[]) {
    this.setCompanyData('stock', stock);
  }

  splitStockItem(sourceId: string, targetId: string, qty: number, factor: number) {
    const stock = this.getStock();
    const sourceIdx = stock.findIndex(s => s.id === sourceId);
    const targetIdx = stock.findIndex(s => s.id === targetId);
    
    if (sourceIdx !== -1 && targetIdx !== -1 && stock[sourceIdx].quantity >= qty) {
      stock[sourceIdx].quantity -= qty;
      stock[targetIdx].quantity += (qty * factor);
      this.updateStock(stock);
      this.recordCashFlow(0, 'IN', 'Transformation', `Détaillage: ${qty} ${stock[sourceIdx].unit} de ${stock[sourceIdx].designation}`);
    }
  }

  getSales(): Sale[] {
    return this.getCompanyData('sales', []);
  }

  addSale(sale: Sale) {
    const sales = this.getSales();
    this.setCompanyData('sales', [sale, ...sales]);

    const currentStock = this.getStock();
    const updatedStock = currentStock.map(stockItem => {
      const soldItem = sale.items.find(si => si.itemId === stockItem.id);
      if (soldItem) return { ...stockItem, quantity: stockItem.quantity - soldItem.quantity };
      return stockItem;
    });
    this.updateStock(updatedStock);

    // Enregistrement automatique en caisse
    const cashIn = sale.paymentType === 'MIXED' ? (sale.cashAmount || 0) : 
                   (sale.paymentType === 'CREDIT' ? 0 : sale.total);
    
    if (cashIn > 0) {
      this.recordCashFlow(cashIn, 'IN', 'Vente', `Vente #${sale.id} (${sale.customerName || 'Client'})`);
    }

    if (sale.paymentType === 'CREDIT' || (sale.paymentType === 'MIXED' && (sale.creditAmount || 0) > 0)) {
      const creditAmount = sale.paymentType === 'MIXED' ? (sale.creditAmount || 0) : sale.total;
      this.addCreditRecord(sale.customerName || 'Client Inconnu', creditAmount, sale.id, sale.date, sale.authorId);
    }
  }

  private addCreditRecord(customerName: string, amount: number, saleId: string, date: string, authorId: string) {
    const credits = this.getCredits();
    const newCredit: Credit = {
      id: saleId,
      customerName,
      date,
      initialAmount: amount,
      remainingAmount: amount,
      status: 'PENDING',
      history: []
    };
    this.updateCredits([newCredit, ...credits]);
  }

  getCredits(): Credit[] {
    return this.getCompanyData('credits', []);
  }

  updateCredits(credits: Credit[]) {
    this.setCompanyData('credits', credits);
  }

  repayCredit(creditId: string, amount: number) {
    const user = this.getCurrentUser();
    const credits = this.getCredits();
    const updatedCredits = credits.map(c => {
      if (c.id === creditId) {
        const remaining = c.remainingAmount - amount;
        const entry = { date: new Date().toISOString(), amount, note: 'Remboursement', authorId: user?.id || 'system' };
        this.recordCashFlow(amount, 'IN', 'Recouvrement', `Remboursement crédit de ${c.customerName}`);
        return {
          ...c,
          remainingAmount: Math.max(0, remaining),
          status: remaining <= 0 ? 'PAID' : 'PENDING',
          history: [...c.history, entry]
        } as Credit;
      }
      return c;
    });
    this.updateCredits(updatedCredits);
  }

  getCashFlow(): CashFlow[] {
    return this.getCompanyData('cash', []);
  }

  recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) {
    const entries = this.getCashFlow();
    const entry: CashFlow = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      date: new Date().toISOString(),
      type,
      category,
      description,
      amount,
      author: this.getUser()
    };
    this.setCompanyData('cash', [entry, ...entries]);
  }

  getCashBalance(): number {
    const flows = this.getCashFlow();
    return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0);
  }

  getInventories(): InventoryReport[] {
    return this.getCompanyData('inventory', []);
  }

  addInventory(report: InventoryReport) {
    const reports = this.getInventories();
    this.setCompanyData('inventory', [report, ...reports]);
  }

  getOperations(): Operation[] {
    return this.getCompanyData('operations', []);
  }

  saveOperations(ops: Operation[]): void {
    this.setCompanyData('operations', ops);
  }

  getAppointments(): Appointment[] {
    return this.getCompanyData('appointments', []);
  }

  saveAppointments(apps: Appointment[]): void {
    this.setCompanyData('appointments', apps);
  }

  getQuotes(): Quote[] {
    return this.getCompanyData('quotes', []);
  }

  saveQuotes(quotes: Quote[]): void {
    this.setCompanyData('quotes', quotes);
  }

  getExchangeRate(): number {
    return this.getCompanyData('rate', 2850);
  }

  updateExchangeRate(rate: number): void {
    this.setCompanyData('rate', rate);
  }

  formatFC(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
  }

  formatUSD(amountFC: number): string {
    const rate = this.getExchangeRate();
    const usd = amountFC / rate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd);
  }

  getUser(): string {
    return this.getCurrentUser()?.name || 'Système';
  }

  getWeeklySalesData() {
    const sales = this.getSales();
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTotal = sales
        .filter(s => s.date.startsWith(dateStr))
        .reduce((sum, s) => sum + s.total, 0);
      data.push({ name: days[d.getDay()], amount: dayTotal });
    }
    return data;
  }

  resetAll() {
    localStorage.clear();
    window.location.href = window.location.origin;
  }
}

export const storageService = new StorageService();
