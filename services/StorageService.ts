
import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, LicenseInfo, PMEEntry, Operation, Appointment, Quote, SubCategory, View } from '../types';
import { ApiService } from './ApiService';

class StorageService {
  private currentPmeId: string | null = null;

  constructor() {
    this.currentPmeId = localStorage.getItem('nexapme_active_id');
  }

  setActiveCompany(id: string) {
    this.currentPmeId = id;
    localStorage.setItem('nexapme_active_id', id);
  }

  getActiveCompanyId() { return this.currentPmeId; }

  // Génération UUID Client comme demandé par la doc
  generateUUID() {
    return crypto.randomUUID();
  }

  // --- Stock ---
  async fetchStock(): Promise<StockItem[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getStock(this.currentPmeId);
      const stock = data.map((item: any) => ({
        id: item.id,
        designation: item.designation,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        retailPrice: parseFloat(item.retail_price || 0),
        wholesalePrice: parseFloat(item.wholesale_price || 0),
        purchasePrice: parseFloat(item.purchase_price || 0),
        alertThreshold: parseFloat(item.alert_threshold || 5),
        category: item.category || 'Général',
        isWholesale: item.is_wholesale === "1"
      }));
      localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(stock));
      return stock;
    } catch (e) {
      const cache = localStorage.getItem(`cache_stock_${this.currentPmeId}`);
      return cache ? JSON.parse(cache) : [];
    }
  }

  async saveStockItem(item: Partial<StockItem>) {
    const payload = { 
      id: item.id || this.generateUUID(),
      pme_id: this.currentPmeId,
      designation: item.designation,
      quantity: item.quantity,
      unit: item.unit,
      retail_price: item.retailPrice 
    };
    await ApiService.saveProduct(payload);
    await this.fetchStock(); 
  }

  // --- Sales ---
  async addSale(sale: Sale) {
    const payload = { 
      id: sale.id || this.generateUUID(),
      pme_id: this.currentPmeId,
      user_id: this.getCurrentUser()?.id,
      payment_type: sale.paymentType,
      customer_name: sale.customerName || 'Client Comptant',
      items: sale.items.map(it => ({
        item_id: it.itemId,
        quantity: it.quantity
      }))
    };
    await ApiService.createSale(payload);
    localStorage.removeItem(`cache_stock_${this.currentPmeId}`);
    localStorage.removeItem(`cache_sales_${this.currentPmeId}`);
  }

  async fetchSales(): Promise<Sale[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getSales(this.currentPmeId);
      // Adaptation des champs sale_date vers date
      const sales = data.map((s: any) => ({
        ...s,
        date: s.sale_date || s.date,
        total: parseFloat(s.total || 0)
      }));
      localStorage.setItem(`cache_sales_${this.currentPmeId}`, JSON.stringify(sales));
      return sales;
    } catch (e) {
      const cache = localStorage.getItem(`cache_sales_${this.currentPmeId}`);
      return cache ? JSON.parse(cache) : [];
    }
  }

  // --- Dashboard Stats ---
  async fetchDashboardStats() {
    if (!this.currentPmeId) return null;
    return await ApiService.getStats(this.currentPmeId);
  }

  // --- Auth & Session ---
  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    try {
      if (key === 'NEXA-DEMO') {
        return { key, type: 'TRIAL', pmeName: 'Démo nexaPME', idUnique: 'TRIAL_ID' };
      }
      const res = await ApiService.validateLicense(key);
      // Map JSON doc { id, name, license_type, expiry_date } -> { idUnique, pmeName, type, expiryDate }
      const license: LicenseInfo = {
        key: key,
        idUnique: res.id,
        pmeName: res.name,
        type: res.license_type,
        expiryDate: res.expiry_date
      };
      localStorage.setItem('nexapme_active_license_info', JSON.stringify(license));
      return license;
    } catch (e) {
      return null;
    }
  }

  async loginRemote(pme_id: string, user_id: string, pin: string) {
    const res = await ApiService.login(pme_id, user_id, pin);
    localStorage.setItem('nexapme_jwt', res.token);
    const user: UserProfile = { 
      id: res.user.id, 
      name: res.user.name, 
      role: res.user.role, 
      pin: '',
      permissions: this.getDefaultPermissions(res.user.role)
    };
    this.setCurrentUser(user);
    return { user, token: res.token };
  }

  // --- Local Storage fallback / cache management ---
  getSales(): Sale[] { const cache = localStorage.getItem(`cache_sales_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  getStock(): StockItem[] { const cache = localStorage.getItem(`cache_stock_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  getCashFlow(): CashFlow[] { const cache = localStorage.getItem(`cache_cash_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  getCashBalance(): number { const flows = this.getCashFlow(); return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0); }
  getCurrentUser(): UserProfile | null { const data = localStorage.getItem('nexapme_current_session'); return data ? JSON.parse(data) : null; }
  setCurrentUser(user: UserProfile | null) { if (user) localStorage.setItem('nexapme_current_session', JSON.stringify(user)); else localStorage.removeItem('nexapme_current_session'); }
  getLicense(): LicenseInfo | null { const data = localStorage.getItem('nexapme_active_license_info'); return data ? JSON.parse(data) : null; }
  clearLicense() { localStorage.clear(); window.location.reload(); }
  getCompanyInfo(): CompanyConfig | null { const data = localStorage.getItem(`nexapme_${this.currentPmeId}_config`); return data ? JSON.parse(data) : null; }
  saveCompanyInfo(config: CompanyConfig) { localStorage.setItem(`nexapme_${this.currentPmeId}_config`, JSON.stringify(config)); }
  getUsers(): UserProfile[] { const data = localStorage.getItem(`nexapme_users_list_${this.currentPmeId}`); return data ? JSON.parse(data) : []; }
  saveUsers(users: UserProfile[]) { localStorage.setItem(`nexapme_users_list_${this.currentPmeId}`, JSON.stringify(users)); }
  getDefaultPermissions(role: string): View[] { return role === 'MANAGER' ? Object.values(View) : [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY]; }
  getExchangeRate(): number { return Number(localStorage.getItem('nexapme_rate')) || 2850; }
  updateExchangeRate(rate: number) { localStorage.setItem('nexapme_rate', rate.toString()); }
  formatFC(amount: number): string { return new Intl.NumberFormat('fr-FR').format(amount) + ' FC'; }
  formatUSD(amountFC: number): string { const rate = this.getExchangeRate(); return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountFC / rate); }
  
  recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) { 
    const flows = this.getCashFlow();
    const newFlow: CashFlow = {
      id: this.generateUUID(),
      date: new Date().toISOString(),
      type,
      category,
      description,
      amount,
      author: this.getCurrentUser()?.name || 'system'
    };
    localStorage.setItem(`cache_cash_${this.currentPmeId}`, JSON.stringify([newFlow, ...flows]));
  }
  
  // --- Missing methods to fix errors ---

  async fetchCashFlow(): Promise<CashFlow[]> {
    return this.getCashFlow();
  }

  async fetchCredits(): Promise<Credit[]> {
    return this.getCredits();
  }

  getCredits(): Credit[] {
    const data = localStorage.getItem(`gestoalim_credits_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  async repayCredit(id: string, amount: number) {
    const credits = this.getCredits();
    const updated = credits.map(c => {
      if (c.id === id) {
        const remaining = Math.max(0, c.remainingAmount - amount);
        const history = [...c.history, { 
          date: new Date().toISOString(), 
          amount, 
          note: 'Remboursement partiel', 
          authorId: this.getCurrentUser()?.id || 'system' 
        }];
        return { ...c, remainingAmount: remaining, status: (remaining === 0 ? 'PAID' : 'PENDING') as 'PAID' | 'PENDING', history };
      }
      return c;
    });
    localStorage.setItem(`gestoalim_credits_${this.currentPmeId}`, JSON.stringify(updated));
    this.recordCashFlow(amount, 'IN', 'Remboursement', `Remboursement crédit client`);
    return null;
  }

  async fetchInventories(): Promise<InventoryReport[]> {
    return this.getInventories();
  }

  getInventories(): InventoryReport[] {
    const data = localStorage.getItem(`gestoalim_inventory_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  addInventory(report: InventoryReport) {
    const reports = this.getInventories();
    localStorage.setItem(`gestoalim_inventory_${this.currentPmeId}`, JSON.stringify([report, ...reports]));
  }

  updateStock(stock: StockItem[]) {
    localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(stock));
  }

  getSubCategories(): SubCategory[] {
    const data = localStorage.getItem(`nexapme_subcategories_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  saveSubCategories(subs: SubCategory[]) {
    localStorage.setItem(`nexapme_subcategories_${this.currentPmeId}`, JSON.stringify(subs));
  }

  getOperations(): Operation[] {
    const data = localStorage.getItem(`nexapme_operations_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  saveOperations(ops: Operation[]) {
    localStorage.setItem(`nexapme_operations_${this.currentPmeId}`, JSON.stringify(ops));
  }

  getAppointments(): Appointment[] {
    const data = localStorage.getItem(`nexapme_appointments_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  saveAppointments(apps: Appointment[]) {
    localStorage.setItem(`nexapme_appointments_${this.currentPmeId}`, JSON.stringify(apps));
  }

  getQuotes(): Quote[] {
    const data = localStorage.getItem(`nexapme_quotes_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  saveQuotes(quotes: Quote[]) {
    localStorage.setItem(`nexapme_quotes_${this.currentPmeId}`, JSON.stringify(quotes));
  }

  async getPmeListRemote(): Promise<PMEEntry[]> {
    return [];
  }

  async createPmeRemote(data: any) {
    return null;
  }

  async updatePmeRemote(id: string, data: any) {
    return null;
  }

  async deletePmeRemote(id: string) {
    return null;
  }

  exportAllDataAsJSON() {
    const data = {
      stock: this.getStock(),
      sales: this.getSales(),
      cash: this.getCashFlow(),
      inventory: this.getInventories(),
      credits: this.getCredits(),
      config: this.getCompanyInfo(),
      users: this.getUsers(),
      subCategories: this.getSubCategories(),
      operations: this.getOperations(),
      appointments: this.getAppointments(),
      quotes: this.getQuotes()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexapme_backup_${this.currentPmeId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

  importDataFromJSON(text: string) {
    try {
      const data = JSON.parse(text);
      if (data.stock) localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(data.stock));
      if (data.sales) localStorage.setItem(`cache_sales_${this.currentPmeId}`, JSON.stringify(data.sales));
      if (data.cash) localStorage.setItem(`cache_cash_${this.currentPmeId}`, JSON.stringify(data.cash));
      if (data.inventory) localStorage.setItem(`gestoalim_inventory_${this.currentPmeId}`, JSON.stringify(data.inventory));
      if (data.credits) localStorage.setItem(`gestoalim_credits_${this.currentPmeId}`, JSON.stringify(data.credits));
      if (data.config) localStorage.setItem(`nexapme_${this.currentPmeId}_config`, JSON.stringify(data.config));
      if (data.users) localStorage.setItem(`nexapme_users_list_${this.currentPmeId}`, JSON.stringify(data.users));
      if (data.subCategories) localStorage.setItem(`nexapme_subcategories_${this.currentPmeId}`, JSON.stringify(data.subCategories));
      if (data.operations) localStorage.setItem(`nexapme_operations_${this.currentPmeId}`, JSON.stringify(data.operations));
      if (data.appointments) localStorage.setItem(`nexapme_appointments_${this.currentPmeId}`, JSON.stringify(data.appointments));
      if (data.quotes) localStorage.setItem(`nexapme_quotes_${this.currentPmeId}`, JSON.stringify(data.quotes));
      alert("Importation réussie. Rechargez l'application.");
      window.location.reload();
    } catch (e) {
      alert("Erreur d'importation : fichier JSON invalide.");
    }
  }

  getWeeklySalesData() {
    return [];
  }
}

export const storageService = new StorageService();
