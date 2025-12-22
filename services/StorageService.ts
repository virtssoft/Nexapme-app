
import { STORAGE_KEYS, INITIAL_STOCK } from '../constants';
import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, PMEEntry, LicenseInfo, View, SubCategory, Operation, Appointment, Quote } from '../types';
import { ApiService } from './ApiService';

class StorageService {
  private currentCompanyId: string | null = null;

  constructor() {
    this.currentCompanyId = localStorage.getItem('nexapme_active_id');
  }

  setActiveCompany(id: string) {
    this.currentCompanyId = id;
    localStorage.setItem('nexapme_active_id', id);
  }

  getActiveCompanyId(): string | null {
    return this.currentCompanyId;
  }

  // --- Méthodes de Session ---
  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    if (key === 'TRIAL_MODE') {
      return { key, type: 'TRIAL', pmeName: 'ENTREPRISE D\'ESSAI', idUnique: 'TRIAL_PME' };
    }
    if (key === 'nexaPME2025') {
      return { key, type: 'ADMIN', pmeName: 'ADMINISTRATION', idUnique: 'ADMIN' };
    }
    if (key === 'nexaUNN2025') {
      return { key, type: 'UNIVERSAL', pmeName: 'MASTER PME', idUnique: 'MASTER_PME' };
    }

    try {
      const res = await ApiService.validateLicense(key);
      if (res && res.id) {
        return {
          key: key,
          type: res.license_type,
          expiryDate: res.expiry_date,
          pmeName: res.name,
          idUnique: res.id
        };
      }
      return null;
    } catch (e) {
      console.error("Erreur de validation via API:", e);
      return null;
    }
  }

  async loginRemote(pme_id: string, user_id: string, pin: string): Promise<{user: UserProfile, token: string} | null> {
    if (pme_id === 'TRIAL_PME' || pme_id === 'ADMIN') {
        const user: UserProfile = { id: user_id, name: 'Utilisateur Test', role: 'MANAGER', pin };
        localStorage.setItem('nexapme_current_session', JSON.stringify(user));
        return { user, token: 'local-session-token' };
    }

    try {
      const res = await ApiService.login(pme_id, user_id, pin);
      localStorage.setItem('nexapme_jwt', res.token);
      const user = { id: res.user.id, name: res.user.name, role: res.user.role, pin };
      localStorage.setItem('nexapme_current_session', JSON.stringify(user));
      return { user, token: res.token };
    } catch (e) {
      return null;
    }
  }

  // --- Gestion du Stock ---
  getStock(): StockItem[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_stock`);
    return cache ? JSON.parse(cache) : [];
  }

  updateStock(items: StockItem[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_stock`, JSON.stringify(items));
  }

  async fetchStock(): Promise<StockItem[]> {
    if (!this.currentCompanyId || this.currentCompanyId === 'TRIAL_PME') return this.getStock();
    try {
      const remote = await ApiService.getStock(this.currentCompanyId);
      const formatted = remote.map((item: any) => ({
        id: item.id,
        designation: item.designation,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        retailPrice: parseFloat(item.retail_price),
        category: item.category || 'Général',
        purchasePrice: parseFloat(item.purchase_price || 0),
        alertThreshold: 5,
        isWholesale: item.is_wholesale === "1" || item.is_wholesale === true
      }));
      localStorage.setItem(`nexapme_${this.currentCompanyId}_stock`, JSON.stringify(formatted));
      return formatted;
    } catch (e) {
      return this.getStock();
    }
  }

  async saveStockItem(item: Partial<StockItem>) {
    if (!this.currentCompanyId) return;
    if (this.currentCompanyId === 'TRIAL_PME') {
        const stock = this.getStock();
        const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) } as StockItem;
        this.updateStock([...stock, newItem]);
        return { success: true };
    }
    const payload = {
      ...item,
      pme_id: this.currentCompanyId,
      retail_price: item.retailPrice,
      purchase_price: item.purchasePrice,
      is_wholesale: item.isWholesale ? 1 : 0
    };
    return await ApiService.createStock(payload);
  }

  // --- Gestion des Ventes ---
  getSales(): Sale[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_sales`);
    return cache ? JSON.parse(cache) : [];
  }

  async fetchSalesHistory(): Promise<Sale[]> {
    if (!this.currentCompanyId || this.currentCompanyId === 'TRIAL_PME') return this.getSales();
    try {
      const remote = await ApiService.getSalesHistory(this.currentCompanyId);
      const formatted = remote.map((s: any) => ({
        id: s.id,
        date: s.sale_date,
        total: parseFloat(s.total),
        paymentType: s.payment_type,
        customerName: s.customer_name,
        author: s.author_name || 'Utilisateur',
        items: s.items ? s.items.map((i: any) => ({
          itemId: i.item_id,
          designation: i.designation,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unit_price),
          total: parseFloat(i.total)
        })) : []
      }));
      localStorage.setItem(`nexapme_${this.currentCompanyId}_sales`, JSON.stringify(formatted));
      return formatted;
    } catch (e) {
      return this.getSales();
    }
  }

  async addSale(sale: Sale) {
    if (!this.currentCompanyId) return;
    const sales = this.getSales();
    localStorage.setItem(`nexapme_${this.currentCompanyId}_sales`, JSON.stringify([sale, ...sales]));

    // Handle Credit creation if needed
    if (sale.paymentType === 'CREDIT' || (sale.paymentType === 'MIXED' && sale.creditAmount && sale.creditAmount > 0)) {
      const credits = this.getCredits();
      const newCredit: Credit = {
        id: `CR-${sale.id}`,
        customerName: sale.customerName || 'Client Inconnu',
        date: sale.date,
        initialAmount: sale.creditAmount || sale.total,
        remainingAmount: sale.creditAmount || sale.total,
        status: 'PENDING',
        history: []
      };
      localStorage.setItem(`nexapme_${this.currentCompanyId}_credits`, JSON.stringify([newCredit, ...credits]));
    }

    if (this.currentCompanyId !== 'TRIAL_PME') {
        const payload = {
            id: sale.id,
            pme_id: this.currentCompanyId,
            user_id: sale.authorId,
            payment_type: sale.paymentType,
            customer_name: sale.customerName,
            items: sale.items.map(i => ({ item_id: i.itemId, quantity: i.quantity }))
        };
        await ApiService.createSale(payload).catch(err => console.error("Échec envoi vente API:", err));
    }

    // Record cash flow for CASH part
    if (sale.paymentType === 'CASH' || (sale.paymentType === 'MIXED' && sale.cashAmount && sale.cashAmount > 0) || sale.paymentType === 'MOBILE_MONEY') {
      const amount = sale.paymentType === 'MIXED' ? (sale.cashAmount || 0) : sale.total;
      if (amount > 0) {
        this.recordCashFlow(amount, 'IN', 'Vente', `Vente facture ${sale.id}`);
      }
    }
  }

  // --- Gestion des Crédits ---
  getCredits(): Credit[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_credits`);
    return cache ? JSON.parse(cache) : [];
  }

  repayCredit(id: string, amount: number) {
    if (!this.currentCompanyId) return;
    const credits = this.getCredits();
    const updated = credits.map(c => {
      if (c.id === id) {
        const remaining = Math.max(0, c.remainingAmount - amount);
        return {
          ...c,
          remainingAmount: remaining,
          status: remaining === 0 ? 'PAID' : 'PENDING',
          history: [...c.history, { 
            date: new Date().toISOString(), 
            amount, 
            note: 'Remboursement versement', 
            authorId: this.getCurrentUser()?.id || 'system' 
          }]
        } as Credit;
      }
      return c;
    });
    localStorage.setItem(`nexapme_${this.currentCompanyId}_credits`, JSON.stringify(updated));
    this.recordCashFlow(amount, 'IN', 'Remboursement Crédit', `Paiement crédit client`);
  }

  // --- Journal de Caisse ---
  getCashFlow(): CashFlow[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_cash`);
    return cache ? JSON.parse(cache) : [];
  }

  recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) {
    if (!this.currentCompanyId) return;
    const flows = this.getCashFlow();
    const newFlow: CashFlow = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type,
      category,
      description,
      amount,
      author: this.getUser()
    };
    localStorage.setItem(`nexapme_${this.currentCompanyId}_cash`, JSON.stringify([newFlow, ...flows]));
  }

  getCashBalance(): number {
    const flows = this.getCashFlow();
    return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0);
  }

  // --- Gestion des Inventaires ---
  getInventories(): InventoryReport[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_inventory`);
    return cache ? JSON.parse(cache) : [];
  }

  addInventory(report: InventoryReport) {
    if (!this.currentCompanyId) return;
    const items = this.getInventories();
    localStorage.setItem(`nexapme_${this.currentCompanyId}_inventory`, JSON.stringify([report, ...items]));
  }

  // --- Espace Admin (Gestion PME Centralisée) ---
  async getPmeListRemote(): Promise<PMEEntry[]> {
    try {
      return await ApiService.getPmeList();
    } catch (e) {
      return [];
    }
  }

  async createPmeRemote(pmeData: any) {
    return await ApiService.createPme(pmeData);
  }

  async updatePmeRemote(id: string, pmeData: any) {
    return await ApiService.updatePme(id, pmeData);
  }

  async deletePmeRemote(id: string) {
    return await ApiService.deletePme(id);
  }

  // --- Gestion des Utilisateurs ---
  getUsers(): UserProfile[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_users`);
    return cache ? JSON.parse(cache) : [];
  }

  saveUsers(users: UserProfile[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_users`, JSON.stringify(users));
  }

  // --- Sous-Catégories ---
  getSubCategories(): SubCategory[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_subcategories`);
    return cache ? JSON.parse(cache) : [];
  }

  saveSubCategories(subCategories: SubCategory[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_subcategories`, JSON.stringify(subCategories));
  }

  // --- Opérations ---
  getOperations(): Operation[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_operations`);
    return cache ? JSON.parse(cache) : [];
  }

  saveOperations(operations: Operation[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_operations`, JSON.stringify(operations));
  }

  // --- Rendez-vous ---
  getAppointments(): Appointment[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_appointments`);
    return cache ? JSON.parse(cache) : [];
  }

  saveAppointments(appointments: Appointment[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_appointments`, JSON.stringify(appointments));
  }

  // --- Devis ---
  getQuotes(): Quote[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_quotes`);
    return cache ? JSON.parse(cache) : [];
  }

  saveQuotes(quotes: Quote[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_quotes`, JSON.stringify(quotes));
  }

  // --- Utilitaires de Formatage ---
  getExchangeRate(): number {
    const rate = localStorage.getItem(`nexapme_${this.currentCompanyId}_rate`);
    return rate ? parseFloat(rate) : 2850;
  }

  updateExchangeRate(rate: number): void {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_rate`, rate.toString());
  }

  formatFC(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
  }

  formatUSD(amountFC: number): string {
    const rate = this.getExchangeRate();
    const usd = amountFC / rate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd);
  }

  getCurrentUser(): UserProfile | null {
    const session = localStorage.getItem('nexapme_current_session');
    return session ? JSON.parse(session) : null;
  }

  setCurrentUser(user: UserProfile | null) {
    if (user) localStorage.setItem('nexapme_current_session', JSON.stringify(user));
    else localStorage.removeItem('nexapme_current_session');
  }

  getCompanyInfo(): CompanyConfig | null {
    if (!this.currentCompanyId) return null;
    const config = localStorage.getItem(`nexapme_${this.currentCompanyId}_config`);
    return config ? JSON.parse(config) : null;
  }

  saveCompanyInfo(config: CompanyConfig) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_config`, JSON.stringify(config));
  }

  getUser(): string {
    return this.getCurrentUser()?.name || 'Système';
  }

  // --- Analytics ---
  getWeeklySalesData() {
    const sales = this.getSales();
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const result = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      
      const total = sales
        .filter(s => s.date.startsWith(dateStr))
        .reduce((acc, s) => acc + s.total, 0);
        
      result.push({ name: dayName, amount: total });
    }
    return result;
  }

  resetAll() {
    localStorage.clear();
    window.location.reload();
  }

  exportAllDataAsJSON() {
    if (!this.currentCompanyId) return;
    const data: Record<string, any> = {};
    const prefix = `nexapme_${this.currentCompanyId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          try { data[key] = JSON.parse(value); } catch (e) { data[key] = value; }
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexapme_backup_${this.currentCompanyId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importDataFromJSON(jsonText: string) {
    try {
      const data = JSON.parse(jsonText);
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
      alert("Importation réussie ! L'application va redémarrer.");
      window.location.reload();
    } catch (e) {
      alert("Erreur lors de l'importation : Format JSON invalide.");
    }
  }
}

export const storageService = new StorageService();
