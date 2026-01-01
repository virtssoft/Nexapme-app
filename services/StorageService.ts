
import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, LicenseInfo, PMEEntry, Operation, Appointment, Quote, SubCategory, View, LicenseType } from '../types';
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
      const allPmes = await ApiService.getAdminPmes();
      const foundPme = allPmes.find((p: any) => p.license_key === key);

      if (!foundPme) {
        throw new Error("Clé de licence introuvable. Contactez l'administrateur.");
      }

      if (foundPme.status !== 'ACTIVE') {
        throw new Error("Cette licence est suspendue.");
      }

      const expiry = foundPme.expiry_date;
      if (expiry && new Date(expiry) < new Date()) {
        throw new Error(`Cette licence a expiré.`);
      }

      // 1. Sauvegarde des infos de la PME récupérées du Cloud
      const companyInfo: CompanyConfig = {
        idUnique: foundPme.id,
        name: foundPme.name,
        owner: foundPme.owner_name,
        currency: 'FC',
        setupDate: foundPme.created_at || new Date().toISOString()
      };
      
      this.setActiveCompany(foundPme.id);
      this.saveCompanyInfo(companyInfo);

      // 2. Récupération immédiate des utilisateurs (Gérant + Travailleurs) créés par l'admin
      try {
        const remoteUsers = await ApiService.getUsers(foundPme.id);
        if (remoteUsers && Array.isArray(remoteUsers)) {
          const mappedUsers = remoteUsers.map(u => ({
            id: u.id,
            name: u.name,
            role: u.role,
            pin: '', 
            permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions
          }));
          this.saveUsers(mappedUsers);
        }
      } catch (e) {
        console.warn("Impossible de charger les utilisateurs distants.");
      }

      const license: LicenseInfo = {
        key: key,
        idUnique: foundPme.id,
        pmeName: foundPme.name,
        type: foundPme.license_type as LicenseType,
        expiryDate: expiry
      };
      
      localStorage.setItem('nexapme_active_license_key', key);
      localStorage.setItem('nexapme_active_license_info', JSON.stringify(license));
      return license;
    } catch (e: any) {
      localStorage.removeItem('nexapme_active_license_key');
      throw e;
    }
  }

  async loginRemote(pme_id: string, user_id: string, pin: string) {
    if (!pin) throw new Error("Code PIN requis");
    
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

  // --- Gestion Stock ---
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

  // --- Ventes ---
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

  // --- Session & Config ---
  getCurrentUser(): UserProfile | null { const data = localStorage.getItem('nexapme_current_session'); return data ? JSON.parse(data) : null; }
  setCurrentUser(user: UserProfile | null) { if (user) localStorage.setItem('nexapme_current_session', JSON.stringify(user)); else localStorage.removeItem('nexapme_current_session'); }
  getLicense(): LicenseInfo | null { const data = localStorage.getItem('nexapme_active_license_info'); return data ? JSON.parse(data) : null; }
  clearLicense() { localStorage.clear(); window.location.reload(); }
  getCompanyInfo(): CompanyConfig | null { const data = localStorage.getItem(`nexapme_${this.currentPmeId}_config`); return data ? JSON.parse(data) : null; }
  saveCompanyInfo(config: CompanyConfig) { localStorage.setItem(`nexapme_${this.currentPmeId}_config`, JSON.stringify(config)); }
  getUsers(): UserProfile[] { const data = localStorage.getItem(`nexapme_users_list_${this.currentPmeId}`); return data ? JSON.parse(data) : []; }
  saveUsers(users: UserProfile[]) { localStorage.setItem(`nexapme_users_list_${this.currentPmeId}`, JSON.stringify(users)); }
  getDefaultPermissions(role: string): View[] { return role === 'MANAGER' ? Object.values(View) : [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY]; }
  
  // --- Finances & Divers ---
  getExchangeRate(): number { return Number(localStorage.getItem('nexapme_rate')) || 2850; }
  updateExchangeRate(rate: number) { localStorage.setItem('nexapme_rate', rate.toString()); }
  formatFC(amount: number): string { return new Intl.NumberFormat('fr-FR').format(amount) + ' FC'; }
  formatUSD(amountFC: number): string { const rate = this.getExchangeRate(); return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountFC / rate); }
  
  getCashFlow(): CashFlow[] { return JSON.parse(localStorage.getItem(`cache_cash_${this.currentPmeId}`) || '[]'); }
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
  
  async fetchUsers() { 
    if (!this.currentPmeId) return [];
    const data = await ApiService.getUsers(this.currentPmeId); 
    const mapped = data.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        pin: '',
        permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions
    }));
    this.saveUsers(mapped); 
    return mapped; 
  }

  async saveNewUser(u: any) { 
    await ApiService.createUser({ 
      id: u.id || this.generateUUID(), 
      pme_id: this.currentPmeId, 
      name: u.name, 
      role: u.role || 'WORKER', 
      pin_hash: u.pin, 
      permissions: { sales: true, stock: true, history: true }
    }); 
    await this.fetchUsers(); 
  }
  
  getOperations() { return JSON.parse(localStorage.getItem(`nexapme_operations_${this.currentPmeId}`) || '[]'); }
  saveOperations(ops: any) { localStorage.setItem(`nexapme_operations_${this.currentPmeId}`, JSON.stringify(ops)); }
  getAppointments() { return JSON.parse(localStorage.getItem(`nexapme_appointments_${this.currentPmeId}`) || '[]'); }
  saveAppointments(a: any) { localStorage.setItem(`nexapme_appointments_${this.currentPmeId}`, JSON.stringify(a)); }
  getQuotes() { return JSON.parse(localStorage.getItem(`nexapme_quotes_${this.currentPmeId}`) || '[]'); }
  saveQuotes(q: any) { localStorage.setItem(`nexapme_quotes_${this.currentPmeId}`, JSON.stringify(q)); }
  getSubCategories() { return JSON.parse(localStorage.getItem(`nexapme_subcategories_${this.currentPmeId}`) || '[]'); }
  saveSubCategories(s: any) { localStorage.setItem(`nexapme_subcategories_${this.currentPmeId}`, JSON.stringify(s)); }
  
  getWeeklySalesData() { return []; }

  exportAllDataAsJSON() {
    if (!this.currentPmeId) return;
    const data = {
      company: this.getCompanyInfo(),
      stock: this.getStock(),
      sales: this.getSales(),
      credits: this.getCredits(),
      cash: this.getCashFlow(),
      inventory: this.getInventories(),
      users: this.getUsers(),
      operations: this.getOperations(),
      appointments: this.getAppointments(),
      quotes: this.getQuotes(),
      subcategories: this.getSubCategories()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexapme_backup_${this.currentPmeId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importDataFromJSON(jsonText: string) {
    try {
      const data = JSON.parse(jsonText);
      if (!this.currentPmeId) {
        alert("Aucune PME active. Connectez-vous d'abord.");
        return;
      }
      
      if (data.company) this.saveCompanyInfo(data.company);
      if (data.stock) localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(data.stock));
      if (data.sales) localStorage.setItem(`cache_sales_${this.currentPmeId}`, JSON.stringify(data.sales));
      if (data.credits) localStorage.setItem(`gestoalim_credits_${this.currentPmeId}`, JSON.stringify(data.credits));
      if (data.cash) localStorage.setItem(`cache_cash_${this.currentPmeId}`, JSON.stringify(data.cash));
      if (data.inventory) localStorage.setItem(`gestoalim_inventory_${this.currentPmeId}`, JSON.stringify(data.inventory));
      if (data.users) this.saveUsers(data.users);
      if (data.operations) this.saveOperations(data.operations);
      if (data.appointments) this.saveAppointments(data.appointments);
      if (data.quotes) this.saveQuotes(data.quotes);
      if (data.subcategories) this.saveSubCategories(data.subcategories);
      
      alert("Données importées avec succès. L'application va redémarrer.");
      window.location.reload();
    } catch (e) {
      console.error("Import error:", e);
      alert("Erreur lors de l'importation : Format JSON invalide.");
    }
  }
}
export const storageService = new StorageService();
