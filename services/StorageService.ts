
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

  generateUUID() {
    return crypto.randomUUID();
  }

  // --- Auth & Session ---
  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    try {
      if (key === 'TRIAL_MODE') {
        return {
          key: 'PENDING_TRIAL',
          type: 'TRIAL',
          pmeName: 'Nouvelle PME',
          idUnique: 'TEMP_' + Date.now()
        };
      }

      localStorage.setItem('nexapme_active_license_key', key);
      const res = await ApiService.validateLicense(key);
      
      const type = res.license_type; // ADMIN, UNIVERSAL, NORMAL, TRIAL
      const expiry = res.expiry_date;

      // Logique de vérification demandée
      if (type === 'NORMAL' || type === 'TRIAL') {
        if (expiry && new Date(expiry) < new Date()) {
          throw new Error("Cette licence a expiré. Contactez Nexa.");
        }
      }
      // ADMIN et UNIVERSAL passent sans vérification de date

      const license: LicenseInfo = {
        key: key,
        idUnique: res.id,
        pmeName: res.name,
        type: type,
        expiryDate: expiry
      };
      
      localStorage.setItem('nexapme_active_license_info', JSON.stringify(license));
      return license;
    } catch (e: any) {
      localStorage.removeItem('nexapme_active_license_key');
      throw e;
    }
  }

  async registerPmeRemote(data: CompanyConfig, admin: UserProfile, license: LicenseInfo) {
    // FORMAT EXACT REQUIS PAR L'API
    const pmePayload = {
      id: license.idUnique,
      name: data.name,
      owner_name: data.owner,
      license_key: license.key,
      license_type: license.type,
      expiry_date: license.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    // 1. Enregistrement PME
    await ApiService.createAdminPme(pmePayload);

    // 2. Enregistrement Utilisateur Gérant
    const userPayload = {
      id: admin.id,
      pme_id: license.idUnique,
      name: admin.name,
      role: 'MANAGER',
      pin_hash: admin.pin,
      permissions: JSON.stringify(admin.permissions)
    };
    await ApiService.createUser(userPayload);
    
    // 3. Persistance locale
    localStorage.setItem('nexapme_active_license_key', license.key);
    localStorage.setItem('nexapme_active_license_info', JSON.stringify(license));
    this.setActiveCompany(license.idUnique);
    this.saveCompanyInfo(data);
    this.saveUsers([admin]);
    this.setCurrentUser(admin);
    
    return true;
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

  // --- Stock & Sales ---
  // Added synchronous helper to get stock from cache
  getStock(): StockItem[] {
    if (!this.currentPmeId) return [];
    const cache = localStorage.getItem(`cache_stock_${this.currentPmeId}`);
    return cache ? JSON.parse(cache) : [];
  }

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
      return this.getStock();
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

  // Added synchronous helper to get sales from cache
  getSales(): Sale[] {
    if (!this.currentPmeId) return [];
    const cache = localStorage.getItem(`cache_sales_${this.currentPmeId}`);
    return cache ? JSON.parse(cache) : [];
  }

  async fetchSales(): Promise<Sale[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getSales(this.currentPmeId);
      const sales = data.map((s: any) => ({
        ...s,
        date: s.sale_date || s.date,
        total: parseFloat(s.total || 0)
      }));
      localStorage.setItem(`cache_sales_${this.currentPmeId}`, JSON.stringify(sales));
      return sales;
    } catch (e) {
      return this.getSales();
    }
  }

  // --- Helpers ---
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
  getCashFlow(): CashFlow[] { const cache = localStorage.getItem(`cache_cash_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  getCashBalance(): number { const flows = this.getCashFlow(); return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0); }
  recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) { 
    const flows = this.getCashFlow();
    const newFlow = { id: this.generateUUID(), date: new Date().toISOString(), type, category, description, amount, author: this.getCurrentUser()?.name || 'system' };
    localStorage.setItem(`cache_cash_${this.currentPmeId}`, JSON.stringify([newFlow, ...flows]));
  }
  async fetchCashFlow() { return this.getCashFlow(); }
  async fetchCredits() { return JSON.parse(localStorage.getItem(`gestoalim_credits_${this.currentPmeId}`) || '[]'); }
  getCredits() { return JSON.parse(localStorage.getItem(`gestoalim_credits_${this.currentPmeId}`) || '[]'); }
  async repayCredit(id: string, amount: number) {
    const credits = this.getCredits().map((c: any) => {
      if (c.id === id) {
        const rem = Math.max(0, c.remainingAmount - amount);
        return { ...c, remainingAmount: rem, status: rem === 0 ? 'PAID' : 'PENDING' };
      }
      return c;
    });
    localStorage.setItem(`gestoalim_credits_${this.currentPmeId}`, JSON.stringify(credits));
    this.recordCashFlow(amount, 'IN', 'Remboursement', `Crédit ${id}`);
  }
  async fetchInventories() { return JSON.parse(localStorage.getItem(`gestoalim_inventory_${this.currentPmeId}`) || '[]'); }
  getInventories() { return JSON.parse(localStorage.getItem(`gestoalim_inventory_${this.currentPmeId}`) || '[]'); }
  addInventory(r: any) { localStorage.setItem(`gestoalim_inventory_${this.currentPmeId}`, JSON.stringify([r, ...this.getInventories()])); }
  updateStock(s: any) { localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(s)); }
  async getPmeListRemote() { return await ApiService.getAdminPmes(); }
  async createPmeRemote(d: any) { return await ApiService.createAdminPme({ id: this.generateUUID(), name: d.name, owner_name: d.owner, license_key: d.licenseKey, license_type: d.licenseType, expiry_date: d.expiryDate }); }
  async updatePmeRemote(id: string, d: any) { return await ApiService.updateAdminPme({ id, name: d.name, owner_name: d.owner, license_key: d.licenseKey, license_type: d.licenseType, expiry_date: d.expiryDate }); }
  async deletePmeRemote(id: string) { return await ApiService.deleteAdminPme(id); }
  async fetchUsers() { const data = await ApiService.getUsers(this.currentPmeId!); this.saveUsers(data); return data; }
  async saveNewUser(u: any) { await ApiService.createUser({ id: this.generateUUID(), pme_id: this.currentPmeId, name: u.name, role: u.role, pin_hash: u.pin, permissions: JSON.stringify(u.permissions) }); await this.fetchUsers(); }
  getOperations() { return JSON.parse(localStorage.getItem(`nexapme_operations_${this.currentPmeId}`) || '[]'); }
  saveOperations(ops: any) { localStorage.setItem(`nexapme_operations_${this.currentPmeId}`, JSON.stringify(ops)); }
  getAppointments() { return JSON.parse(localStorage.getItem(`nexapme_appointments_${this.currentPmeId}`) || '[]'); }
  saveAppointments(a: any) { localStorage.setItem(`nexapme_appointments_${this.currentPmeId}`, JSON.stringify(a)); }
  getQuotes() { return JSON.parse(localStorage.getItem(`nexapme_quotes_${this.currentPmeId}`) || '[]'); }
  saveQuotes(q: any) { localStorage.setItem(`nexapme_quotes_${this.currentPmeId}`, JSON.stringify(q)); }
  getSubCategories() { return JSON.parse(localStorage.getItem(`nexapme_subcategories_${this.currentPmeId}`) || '[]'); }
  saveSubCategories(s: any) { localStorage.setItem(`nexapme_subcategories_${this.currentPmeId}`, JSON.stringify(s)); }
  getWeeklySalesData() { return []; }
  exportAllDataAsJSON() { /* ... */ }
  importDataFromJSON(j: string) { /* ... */ }
}
export const storageService = new StorageService();
