
import { STORAGE_KEYS, INITIAL_STOCK } from '../constants';
import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, PMEEntry, LicenseInfo, View, SubCategory, Operation, Appointment, Quote } from '../types';
import { ApiService } from './ApiService';

class StorageService {
  private currentCompanyId: string | null = null;

  constructor() {
    try {
      this.currentCompanyId = localStorage.getItem('nexapme_active_id');
    } catch (e) {
      console.error("Storage access error:", e);
    }
  }

  private getGlobal<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error parsing global key ${key}:`, e);
      return defaultValue;
    }
  }

  private setGlobal<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error setting global key ${key}:`, e);
    }
  }

  private getCompanyData<T>(key: string, defaultValue: T): T {
    if (!this.currentCompanyId) return defaultValue;
    try {
      const data = localStorage.getItem(`nexapme_${this.currentCompanyId}_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error parsing company data ${key}:`, e);
      return defaultValue;
    }
  }

  private setCompanyData<T>(key: string, data: T): void {
    if (!this.currentCompanyId) return;
    try {
      localStorage.setItem(`nexapme_${this.currentCompanyId}_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error(`Error setting company data ${key}:`, e);
    }
  }

  setActiveCompany(id: string) {
    this.currentCompanyId = id;
    this.setGlobal('nexapme_active_id', id);
  }

  getActiveCompanyId(): string | null {
    return this.currentCompanyId;
  }

  // --- API ASYNC WRAPPERS ---
  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    // Clés de secours admin locales
    if (key === 'nexaPME2025') return { key, type: 'ADMIN', pmeName: 'ADMINISTRATION', idUnique: 'ADMIN' };
    if (key === 'nexaUNN2025') return { key, type: 'UNIVERSAL', pmeName: 'ENTREPRISE MAITRESSE', idUnique: 'MASTER_PME' };

    try {
      const res = await ApiService.validateLicense(key);
      return {
        key: key,
        type: res.license_type,
        expiryDate: res.expiry_date,
        pmeName: res.name,
        idUnique: res.id
      };
    } catch (e) {
      return null;
    }
  }

  async loginRemote(pme_id: string, user_id: string, pin: string): Promise<{user: UserProfile, token: string} | null> {
    try {
      const res = await ApiService.login(pme_id, user_id, pin);
      localStorage.setItem('nexapme_jwt', res.token);
      return {
        user: {
          id: res.user.id,
          name: res.user.name,
          role: res.user.role,
          pin: pin // Optionnel, car on a le token maintenant
        },
        token: res.token
      };
    } catch (e) {
      return null;
    }
  }

  // --- LOCAL METHODS ---
  getCompanyInfo(): CompanyConfig | null { return this.getCompanyData('config', null); }
  saveCompanyInfo(config: CompanyConfig) { this.setCompanyData('config', config); }
  getUsers(): UserProfile[] { return this.getCompanyData('users', []); }
  saveUsers(users: UserProfile[]) { this.setCompanyData('users', users); }
  getCurrentUser(): UserProfile | null { return this.getGlobal('nexapme_current_session', null); }
  setCurrentUser(user: UserProfile | null) { this.setGlobal('nexapme_current_session', user); }
  
  // --- DATA SYNC ---
  async syncStockFromServer() {
    if (!this.currentCompanyId) return;
    try {
      const remoteStock = await ApiService.getStock(this.currentCompanyId);
      // Transformation format API -> format Local
      const stock: StockItem[] = remoteStock.map((item: any) => ({
        id: item.id,
        designation: item.designation,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        retailPrice: parseFloat(item.retail_price),
        category: item.category || 'Général',
        purchasePrice: parseFloat(item.purchase_price || 0),
        alertThreshold: 5
      }));
      this.updateStock(stock);
    } catch (e) { console.error("Sync failed"); }
  }

  // --- EXISTING METHODS (BUFFER) ---
  getStock(): StockItem[] { return this.getCompanyData('stock', INITIAL_STOCK); }
  updateStock(stock: StockItem[]) { this.setCompanyData('stock', stock); }
  
  getSales(): Sale[] { return this.getCompanyData('sales', []); }
  addSale(sale: Sale) {
    const sales = this.getSales();
    this.setCompanyData('sales', [sale, ...sales]);
    
    // Tenter d'envoyer à l'API
    ApiService.createSale({
      id: sale.id,
      pme_id: this.currentCompanyId,
      user_id: sale.authorId,
      payment_type: sale.paymentType,
      customer_name: sale.customerName,
      items: sale.items.map(i => ({ item_id: i.itemId, quantity: i.quantity }))
    }).catch(e => console.warn("Sale stored locally only (offline)"));

    // Gestion automatique des crédits
    if (sale.paymentType === 'CREDIT' || (sale.paymentType === 'MIXED' && (sale.creditAmount || 0) > 0)) {
        const credits = this.getCredits();
        const creditAmount = sale.paymentType === 'CREDIT' ? sale.total : (sale.creditAmount || 0);
        const newCredit: Credit = {
            id: sale.id,
            customerName: sale.customerName || 'Client Inconnu',
            date: sale.date,
            remainingAmount: creditAmount,
            initialAmount: creditAmount,
            status: 'PENDING',
            history: []
        };
        this.setCompanyData(STORAGE_KEYS.CREDITS, [newCredit, ...credits]);
    }

    const currentStock = this.getStock();
    const updatedStock = currentStock.map(stockItem => {
      const soldItem = sale.items.find(si => si.itemId === stockItem.id);
      if (soldItem) return { ...stockItem, quantity: stockItem.quantity - soldItem.quantity };
      return stockItem;
    });
    this.updateStock(updatedStock);
  }

  // --- CREDITS METHODS ---
  getCredits(): Credit[] { return this.getCompanyData(STORAGE_KEYS.CREDITS, []); }
  repayCredit(id: string, amount: number) {
    const credits = this.getCredits();
    const credit = credits.find(c => c.id === id);
    if (credit) {
      credit.remainingAmount -= amount;
      credit.history.push({
        date: new Date().toISOString(),
        amount,
        note: 'Remboursement partiel',
        authorId: this.getCurrentUser()?.id || 'system'
      });
      if (credit.remainingAmount <= 0) {
        credit.status = 'PAID';
        credit.remainingAmount = 0;
      }
      this.setCompanyData(STORAGE_KEYS.CREDITS, credits);
      this.recordCashFlow(amount, 'IN', 'Crédit Client', `Remboursement de ${credit.customerName}`);
    }
  }

  // --- CASH FLOW METHODS ---
  getCashFlow(): CashFlow[] { return this.getCompanyData('cash', []); }
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

  // --- INVENTORY METHODS ---
  getInventories(): InventoryReport[] { return this.getCompanyData(STORAGE_KEYS.INVENTORY, []); }
  addInventory(report: InventoryReport) {
    const invs = this.getInventories();
    this.setCompanyData(STORAGE_KEYS.INVENTORY, [report, ...invs]);
  }

  // --- OPERATIONS & APPOINTMENTS ---
  getOperations(): Operation[] { return this.getCompanyData(STORAGE_KEYS.OPERATIONS, []); }
  saveOperations(ops: Operation[]) { this.setCompanyData(STORAGE_KEYS.OPERATIONS, ops); }
  getAppointments(): Appointment[] { return this.getCompanyData(STORAGE_KEYS.APPOINTMENTS, []); }
  saveAppointments(apps: Appointment[]) { this.setCompanyData(STORAGE_KEYS.APPOINTMENTS, apps); }

  // --- QUOTES & CATEGORIES ---
  getQuotes(): Quote[] { return this.getCompanyData(STORAGE_KEYS.QUOTES, []); }
  saveQuotes(quotes: Quote[]) { this.setCompanyData(STORAGE_KEYS.QUOTES, quotes); }
  getSubCategories(): SubCategory[] { return this.getCompanyData(STORAGE_KEYS.SUBCATEGORIES, []); }
  saveSubCategories(subs: SubCategory[]) { this.setCompanyData(STORAGE_KEYS.SUBCATEGORIES, subs); }

  // --- ADMIN METHODS ---
  getPMEList(): PMEEntry[] { return this.getGlobal('nexapme_pme_list', []); }
  savePMEList(list: PMEEntry[]) { this.setGlobal('nexapme_pme_list', list); }

  // --- UTILS ---
  getExchangeRate(): number { return this.getCompanyData('rate', 2850); }
  updateExchangeRate(rate: number): void { this.setCompanyData('rate', rate); }
  formatFC(amount: number): string { return new Intl.NumberFormat('fr-FR').format(amount) + ' FC'; }
  formatUSD(amountFC: number): string {
    const rate = this.getExchangeRate();
    const usd = amountFC / rate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd);
  }
  getUser(): string { return this.getCurrentUser()?.name || 'Système'; }

  splitStockItem(sourceId: string, targetId: string, qty: number, factor: number) {
    const stock = this.getStock();
    const source = stock.find(s => s.id === sourceId);
    const target = stock.find(s => s.id === targetId);
    
    if (source && target && source.quantity >= qty) {
      source.quantity -= qty;
      target.quantity += (qty * factor);
      this.updateStock(stock);
    }
  }

  getWeeklySalesData() {
    const sales = this.getSales();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const amount = sales
        .filter(s => s.date.startsWith(dayStr))
        .reduce((acc, s) => acc + s.total, 0);
      data.push({ name: dayName, amount });
    }
    return data;
  }

  exportAllDataAsJSON() {
    const data: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexapme_')) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexapme_backup_${new Date().toISOString()}.json`;
    a.click();
  }

  importDataFromJSON(jsonStr: string) {
    try {
      const data = JSON.parse(jsonStr);
      Object.keys(data).forEach(key => {
        localStorage.setItem(key, data[key]);
      });
      window.location.reload();
    } catch (e) {
      alert("Erreur lors de l'importation.");
    }
  }
  
  resetAll() {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) { console.error("Clear storage error:", e); }
  }
}

export const storageService = new StorageService();
