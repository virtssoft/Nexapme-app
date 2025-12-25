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

  getDefaultPermissions(role: string): View[] {
    if (role === 'MANAGER' || role === 'ADMIN') {
      return Object.values(View) as View[];
    }
    return [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY];
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
        retailPrice: parseFloat(item.retail_price),
        wholesalePrice: parseFloat(item.wholesale_price || 0),
        purchasePrice: parseFloat(item.purchase_price || 0),
        alertThreshold: parseFloat(item.alert_threshold || 5),
        category: item.category,
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
    const payload = { ...item, pme_id: this.currentPmeId };
    await ApiService.saveProduct(payload);
    await this.fetchStock(); 
  }

  updateStock(stock: StockItem[]) {
    localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(stock));
  }

  // --- Sales ---
  async addSale(sale: Sale) {
    const payload = { ...sale, pme_id: this.currentPmeId };
    await ApiService.createSale(payload);
    localStorage.removeItem(`cache_stock_${this.currentPmeId}`);
    localStorage.removeItem(`cache_sales_${this.currentPmeId}`);
  }

  async fetchSales(): Promise<Sale[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getSales(this.currentPmeId);
      localStorage.setItem(`cache_sales_${this.currentPmeId}`, JSON.stringify(data));
      return data;
    } catch (e) {
      const cache = localStorage.getItem(`cache_sales_${this.currentPmeId}`);
      return cache ? JSON.parse(cache) : [];
    }
  }

  getWeeklySalesData() {
    const sales = this.getSales();
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const daySales = sales.filter(s => s.date.startsWith(date));
      const total = daySales.reduce((acc, s) => acc + s.total, 0);
      return { name: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }), amount: total };
    });
  }

  // --- Finance ---
  async fetchCashFlow(): Promise<CashFlow[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getCashFlow(this.currentPmeId);
      localStorage.setItem(`cache_cash_${this.currentPmeId}`, JSON.stringify(data));
      return data;
    } catch (e) { return []; }
  }

  getCashFlow(): CashFlow[] {
    const cache = localStorage.getItem(`cache_cash_${this.currentPmeId}`);
    return cache ? JSON.parse(cache) : [];
  }

  async recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) {
    const payload = { pme_id: this.currentPmeId, amount, type, category, description, author: this.getUser() };
    return await ApiService.recordCash(payload);
  }

  // Caching credits for synchronous access and resolving missing property error
  async fetchCredits(): Promise<Credit[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getCredits(this.currentPmeId);
      localStorage.setItem(`cache_credits_${this.currentPmeId}`, JSON.stringify(data));
      return data;
    } catch (e) {
      return this.getCredits();
    }
  }

  getCredits(): Credit[] {
    const cache = localStorage.getItem(`cache_credits_${this.currentPmeId}`);
    return cache ? JSON.parse(cache) : [];
  }

  async repayCredit(id: string, amount: number) {
    const res = await ApiService.repayCredit({ credit_id: id, amount, author: this.getUser() });
    await this.fetchCredits(); // Refresh the local cache after repayment
    return res;
  }

  // --- Inventory ---
  async fetchInventories(): Promise<InventoryReport[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getInventories(this.currentPmeId);
      localStorage.setItem(`gestoalim_inventory_${this.currentPmeId}`, JSON.stringify(data));
      return data;
    } catch (e) {
      const cache = localStorage.getItem(`gestoalim_inventory_${this.currentPmeId}`);
      return cache ? JSON.parse(cache) : [];
    }
  }

  async addInventory(report: InventoryReport) {
    const payload = { ...report, pme_id: this.currentPmeId };
    await ApiService.saveInventory(payload);
    await this.fetchInventories();
  }

  getInventories(): InventoryReport[] {
    const data = localStorage.getItem(`gestoalim_inventory_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  // --- Users ---
  async fetchUsers(): Promise<UserProfile[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getUsers(this.currentPmeId);
      localStorage.setItem(`nexapme_users_list_${this.currentPmeId}`, JSON.stringify(data));
      return data;
    } catch (e) {
      return this.getUsers();
    }
  }

  getUsers(): UserProfile[] {
    const data = localStorage.getItem(`nexapme_users_list_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  async saveUsers(users: UserProfile[]) {
    // Dans une API réelle, on enverrait l'utilisateur créé individuellement
    // Ici on garde la logique de liste pour la compatibilité
    localStorage.setItem(`nexapme_users_list_${this.currentPmeId}`, JSON.stringify(users));
  }

  // --- Modules Getters ---
  getOperations(): Operation[] { return JSON.parse(localStorage.getItem(`nexapme_operations_${this.currentPmeId}`) || '[]'); }
  saveOperations(ops: Operation[]) { localStorage.setItem(`nexapme_operations_${this.currentPmeId}`, JSON.stringify(ops)); }
  getAppointments(): Appointment[] { return JSON.parse(localStorage.getItem(`nexapme_appointments_${this.currentPmeId}`) || '[]'); }
  saveAppointments(apps: Appointment[]) { localStorage.setItem(`nexapme_appointments_${this.currentPmeId}`, JSON.stringify(apps)); }
  getQuotes(): Quote[] { return JSON.parse(localStorage.getItem(`nexapme_quotes_${this.currentPmeId}`) || '[]'); }
  saveQuotes(quotes: Quote[]) { localStorage.setItem(`nexapme_quotes_${this.currentPmeId}`, JSON.stringify(quotes)); }
  getSubCategories(): SubCategory[] { return JSON.parse(localStorage.getItem(`nexapme_subcategories_${this.currentPmeId}`) || '[]'); }
  saveSubCategories(subs: SubCategory[]) { localStorage.setItem(`nexapme_subcategories_${this.currentPmeId}`, JSON.stringify(subs)); }

  // --- Session & Auth ---
  getUser(): string { const user = this.getCurrentUser(); return user ? user.name : 'Système'; }

  getCurrentUser(): UserProfile | null {
    const data = localStorage.getItem('nexapme_current_session');
    return data ? JSON.parse(data) : null;
  }

  setCurrentUser(user: UserProfile | null) {
    if (user) {
      if (!user.permissions || user.permissions.length === 0) user.permissions = this.getDefaultPermissions(user.role);
      localStorage.setItem('nexapme_current_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('nexapme_current_session');
    }
  }

  getLicense(): LicenseInfo | null {
    const data = localStorage.getItem('nexapme_active_license_info');
    return data ? JSON.parse(data) : null;
  }

  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    try {
      if (key === 'TRIAL_MODE' || key === 'NEXA-DEMO') {
        const trial: LicenseInfo = { key, type: 'TRIAL', pmeName: 'Démo nexaPME', idUnique: 'TRIAL_ID' };
        localStorage.setItem('nexapme_active_license_info', JSON.stringify(trial));
        return trial;
      }
      const res = await ApiService.validateLicense(key);
      localStorage.setItem('nexapme_active_license_info', JSON.stringify(res));
      return res;
    } catch (e) {
      const local = this.getLicense();
      if (local && local.key === key) return local;
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

  // --- Admin Methods ---
  async getPmeListRemote(): Promise<PMEEntry[]> {
    try {
      return await ApiService.getPmes();
    } catch (e) {
      const local = localStorage.getItem('nexapme_pme_list_root');
      return local ? JSON.parse(local) : [];
    }
  }
  async createPmeRemote(data: Partial<PMEEntry>) {
    return await ApiService.savePme(data);
  }
  async updatePmeRemote(id: string, data: Partial<PMEEntry>) {
    return await ApiService.savePme({ ...data, idUnique: id });
  }
  async deletePmeRemote(id: string) {
    return await ApiService.deletePme(id);
  }

  // --- Utilities ---
  exportAllDataAsJSON() {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) || '';
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexapme_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

  importDataFromJSON(json: string) {
    try {
      const data = JSON.parse(json);
      Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
      window.location.reload();
    } catch (e) { alert("Erreur d'importation"); }
  }

  resetAll() { localStorage.clear(); window.location.reload(); }
  formatFC(amount: number): string { return new Intl.NumberFormat('fr-FR').format(amount) + ' FC'; }
  formatUSD(amountFC: number): string { const rate = this.getExchangeRate(); return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountFC / rate); }
  getExchangeRate(): number { return Number(localStorage.getItem('nexapme_rate')) || 2850; }
  updateExchangeRate(rate: number) { localStorage.setItem('nexapme_rate', rate.toString()); }
  getCompanyInfo(): CompanyConfig | null { const data = localStorage.getItem(`nexapme_${this.currentPmeId}_config`); return data ? JSON.parse(data) : null; }
  saveCompanyInfo(config: CompanyConfig) { localStorage.setItem(`nexapme_${this.currentPmeId}_config`, JSON.stringify(config)); }
  clearLicense() { localStorage.clear(); window.location.reload(); }
  getStock(): StockItem[] { const cache = localStorage.getItem(`cache_stock_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  getSales(): Sale[] { const cache = localStorage.getItem(`cache_sales_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  getCashBalance(): number { const flows = this.getCashFlow(); return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0); }
}

export const storageService = new StorageService();
