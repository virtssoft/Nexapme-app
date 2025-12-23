
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

  // --- Permissions Helper ---
  getDefaultPermissions(role: string): View[] {
    if (role === 'MANAGER' || role === 'ADMIN') {
      return Object.values(View) as View[];
    }
    return [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY];
  }

  // --- Stock Management ---
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

  // --- Sales Operations ---
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

  // --- Financial Tracking ---
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

  async fetchCredits(): Promise<Credit[]> {
    if (!this.currentPmeId) return [];
    try {
      return await ApiService.getCredits(this.currentPmeId);
    } catch (e) { return []; }
  }

  async repayCredit(id: string, amount: number) {
    return await ApiService.repayCredit({ credit_id: id, amount, author: this.getUser() });
  }

  // --- Inventory Audits ---
  getInventories(): InventoryReport[] {
    const data = localStorage.getItem(`gestoalim_inventory_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }

  addInventory(report: InventoryReport) {
    const reports = this.getInventories();
    const updated = [report, ...reports];
    localStorage.setItem(`gestoalim_inventory_${this.currentPmeId}`, JSON.stringify(updated));
  }

  // --- Modules Getters ---
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
  getUsers(): UserProfile[] {
    const data = localStorage.getItem(`nexapme_users_list_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }
  saveUsers(users: UserProfile[]) {
    localStorage.setItem(`nexapme_users_list_${this.currentPmeId}`, JSON.stringify(users));
  }
  getSubCategories(): SubCategory[] {
    const data = localStorage.getItem(`nexapme_subcategories_${this.currentPmeId}`);
    return data ? JSON.parse(data) : [];
  }
  saveSubCategories(subs: SubCategory[]) {
    localStorage.setItem(`nexapme_subcategories_${this.currentPmeId}`, JSON.stringify(subs));
  }

  // --- Session & Auth ---
  getUser(): string {
    const user = this.getCurrentUser();
    return user ? user.name : 'Système';
  }

  getCurrentUser(): UserProfile | null {
    const data = localStorage.getItem('nexapme_current_session');
    return data ? JSON.parse(data) : null;
  }

  setCurrentUser(user: UserProfile | null) {
    if (user) {
      // Sécurité : s'assurer que les permissions sont présentes lors de la sauvegarde
      if (!user.permissions || user.permissions.length === 0) {
        user.permissions = this.getDefaultPermissions(user.role);
      }
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
      // Mode de secours local immédiat pour la démo
      if (key === 'TRIAL_MODE' || key === 'NEXA-DEMO') {
        const trial: LicenseInfo = { key, type: 'TRIAL', pmeName: 'Démo nexaPME', idUnique: 'TRIAL_ID' };
        localStorage.setItem('nexapme_active_license_info', JSON.stringify(trial));
        return trial;
      }
      
      const res = await ApiService.validateLicense(key);
      if (res) {
        localStorage.setItem('nexapme_active_license_info', JSON.stringify(res));
        return res;
      }
      return null;
    } catch (e) {
      console.warn("Validation API échouée, vérification du cache local...");
      const local = this.getLicense();
      if (local && local.key === key) return local;
      return null;
    }
  }

  async loginRemote(pme_id: string, user_id: string, pin: string) {
    const res = await ApiService.login(pme_id, user_id, pin);
    localStorage.setItem('nexapme_jwt', res.token);
    
    // FIX: Attribution des permissions lors de la connexion
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
    const local = localStorage.getItem('nexapme_pme_list_root');
    return local ? JSON.parse(local) : [];
  }
  async createPmeRemote(data: Partial<PMEEntry>) {
    const pme = { ...data, idUnique: data.idUnique || 'PME-' + Math.random().toString(36).substr(2, 6).toUpperCase(), createdAt: new Date().toISOString() } as PMEEntry;
    const list = await this.getPmeListRemote();
    localStorage.setItem('nexapme_pme_list_root', JSON.stringify([pme, ...list]));
  }
  async updatePmeRemote(id: string, data: Partial<PMEEntry>) {
    const list = await this.getPmeListRemote();
    const updated = list.map(p => p.idUnique === id ? { ...p, ...data } : p);
    localStorage.setItem('nexapme_pme_list_root', JSON.stringify(updated));
  }
  async deletePmeRemote(id: string) {
    const list = await this.getPmeListRemote();
    const updated = list.filter(p => p.idUnique !== id);
    localStorage.setItem('nexapme_pme_list_root', JSON.stringify(updated));
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
      alert("Données importées avec succès !");
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
  getCredits(): Credit[] { return []; }
}

export const storageService = new StorageService();
