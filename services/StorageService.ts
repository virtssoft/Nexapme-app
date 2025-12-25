
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

  // --- Auth & Session ---
  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    try {
      if (key === 'NEXA-DEMO') {
        return { key, type: 'TRIAL', pmeName: 'Démo nexaPME', idUnique: 'TRIAL_ID' };
      }
      const res = await ApiService.validateLicense(key);
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

  // --- Admin Methods (ROOT) ---
  async getPmeListRemote(): Promise<PMEEntry[]> {
    try {
      const data = await ApiService.getAdminPmes();
      return data.map((p: any) => ({
        idUnique: p.id,
        name: p.name,
        owner: p.owner_name,
        licenseKey: p.license_key,
        licenseType: p.license_type,
        expiryDate: p.expiry_date,
        createdAt: p.created_at || new Date().toISOString()
      }));
    } catch (e) {
      console.error("Admin Fetch Error:", e);
      return [];
    }
  }

  async createPmeRemote(data: any) {
    const payload = {
      id: data.idUnique || this.generateUUID(),
      name: data.name,
      owner_name: data.owner,
      license_key: data.licenseKey,
      license_type: data.licenseType,
      expiry_date: data.expiryDate
    };
    return await ApiService.createAdminPme(payload);
  }

  async updatePmeRemote(id: string, data: any) {
    const payload = {
      id: id,
      name: data.name,
      owner_name: data.owner,
      license_key: data.licenseKey,
      license_type: data.licenseType,
      expiry_date: data.expiryDate
    };
    return await ApiService.updateAdminPme(payload);
  }

  async deletePmeRemote(id: string) {
    return await ApiService.deleteAdminPme(id);
  }

  // --- User Management Methods ---
  async fetchUsers(): Promise<UserProfile[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getUsers(this.currentPmeId);
      const users = data.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        pin: u.pin_hash || '',
        permissions: u.permissions ? JSON.parse(u.permissions) : this.getDefaultPermissions(u.role)
      }));
      this.saveUsers(users);
      return users;
    } catch (e) {
      return this.getUsers();
    }
  }

  async saveNewUser(user: Partial<UserProfile>) {
    if (!this.currentPmeId) return;
    const payload = {
      id: this.generateUUID(),
      pme_id: this.currentPmeId,
      name: user.name,
      role: user.role,
      pin_hash: user.pin,
      permissions: JSON.stringify(user.permissions)
    };
    await ApiService.createUser(payload);
    await this.fetchUsers();
  }

  // --- Helpers ---
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

  async fetchCashFlow(): Promise<CashFlow[]> { return this.getCashFlow(); }
  async fetchCredits(): Promise<Credit[]> { return this.getCredits(); }
  getCredits(): Credit[] { return JSON.parse(localStorage.getItem(`gestoalim_credits_${this.currentPmeId}`) || '[]'); }

  async repayCredit(creditId: string, amount: number) {
    const credits = this.getCredits();
    const updated = credits.map(c => {
      if (c.id === creditId) {
        const remaining = Math.max(0, c.remainingAmount - amount);
        return {
          ...c,
          remainingAmount: remaining,
          status: remaining === 0 ? 'PAID' : 'PENDING',
          history: [...c.history, {
            date: new Date().toISOString(),
            amount,
            note: 'Remboursement manuel',
            authorId: this.getCurrentUser()?.id || 'system'
          }]
        } as Credit;
      }
      return c;
    });
    localStorage.setItem(`gestoalim_credits_${this.currentPmeId}`, JSON.stringify(updated));
    this.recordCashFlow(amount, 'IN', 'Remboursement', `Crédit client ${creditId}`);
  }

  async fetchInventories(): Promise<InventoryReport[]> { return this.getInventories(); }
  getInventories(): InventoryReport[] { return JSON.parse(localStorage.getItem(`gestoalim_inventory_${this.currentPmeId}`) || '[]'); }
  addInventory(report: InventoryReport) { localStorage.setItem(`gestoalim_inventory_${this.currentPmeId}`, JSON.stringify([report, ...this.getInventories()])); }
  updateStock(stock: StockItem[]) { localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(stock)); }
  getSubCategories(): SubCategory[] { return JSON.parse(localStorage.getItem(`nexapme_subcategories_${this.currentPmeId}`) || '[]'); }
  saveSubCategories(subs: SubCategory[]) { localStorage.setItem(`nexapme_subcategories_${this.currentPmeId}`, JSON.stringify(subs)); }
  getOperations(): Operation[] { return JSON.parse(localStorage.getItem(`nexapme_operations_${this.currentPmeId}`) || '[]'); }
  saveOperations(ops: Operation[]) { localStorage.setItem(`nexapme_operations_${this.currentPmeId}`, JSON.stringify(ops)); }
  getAppointments(): Appointment[] { return JSON.parse(localStorage.getItem(`nexapme_appointments_${this.currentPmeId}`) || '[]'); }
  saveAppointments(apps: Appointment[]) { localStorage.setItem(`nexapme_appointments_${this.currentPmeId}`, JSON.stringify(apps)); }
  getQuotes(): Quote[] { return JSON.parse(localStorage.getItem(`nexapme_quotes_${this.currentPmeId}`) || '[]'); }
  saveQuotes(quotes: Quote[]) { localStorage.setItem(`nexapme_quotes_${this.currentPmeId}`, JSON.stringify(quotes)); }
  getWeeklySalesData() { return []; }

  exportAllDataAsJSON() {
    const data: any = {};
    const prefix = `nexapme_`;
    const altPrefix = `gestoalim_`;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(prefix) || key.startsWith(altPrefix))) {
            data[key] = localStorage.getItem(key);
        }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexapme_backup_${new Date().toISOString()}.json`;
    link.click();
  }

  importDataFromJSON(json: string) {
    try {
      const data = JSON.parse(json);
      Object.keys(data).forEach(key => {
        localStorage.setItem(key, data[key]);
      });
      alert("Importation réussie. L'application va redémarrer.");
      window.location.reload();
    } catch (e) {
      alert("Erreur lors de l'importation : " + e);
    }
  }
}

export const storageService = new StorageService();
