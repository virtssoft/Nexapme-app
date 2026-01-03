
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

  // --- Auth ---
  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    try {
      const allPmes = await ApiService.getAdminPmes();
      const foundPme = allPmes.find((p: any) => p.license_key === key);

      if (!foundPme) throw new Error("Clé de licence introuvable.");
      if (foundPme.status !== 'ACTIVE' && foundPme.license_type !== 'ADMIN') throw new Error("Licence suspendue.");

      const isRoot = foundPme.license_type === 'ADMIN';
      const companyInfo: CompanyConfig = {
        idUnique: foundPme.id,
        name: foundPme.name,
        owner: foundPme.owner_name,
        currency: (foundPme.currency || 'FC') as 'FC' | 'USD',
        setupDate: foundPme.created_at || new Date().toISOString(),
        address: foundPme.address || '',
        phone: foundPme.phone || '',
        email: foundPme.email || '',
        bankDetails: foundPme.bank_details || ''
      };
      
      this.setActiveCompany(foundPme.id);
      this.saveCompanyInfo(companyInfo);

      const license: LicenseInfo = {
        key: key,
        idUnique: foundPme.id,
        pmeName: foundPme.name,
        type: foundPme.license_type as LicenseType,
        expiryDate: foundPme.expiry_date
      };
      
      localStorage.setItem('nexapme_active_license_key', key);
      localStorage.setItem('nexapme_active_license_info', JSON.stringify(license));
      return license;
    } catch (e: any) {
      throw e;
    }
  }

  async loginRemote(name: string, pin: string) {
    const res = await ApiService.login(name, pin);
    if (res.token) localStorage.setItem('nexapme_jwt', res.token);
    const user: UserProfile = { 
      id: res.user.id, 
      name: res.user.name, 
      role: res.user.role, 
      pin: '',
      permissions: this.getDefaultPermissions(res.user.role)
    };
    this.setCurrentUser(user);
    return { user };
  }

  // --- Stock ---
  getStock(): StockItem[] { if (!this.currentPmeId) return []; const cache = localStorage.getItem(`cache_stock_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  
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
        subCategory: item.sub_category || '',
        isWholesale: item.is_wholesale === "1" || item.is_wholesale === 1
      }));
      localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(stock));
      return stock;
    } catch (e) { return this.getStock(); }
  }

  async fetchInventory(type?: 'wholesale' | 'retail'): Promise<StockItem[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getInventory(this.currentPmeId, type);
      return data.map((item: any) => ({
        id: item.id,
        designation: item.designation,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        retailPrice: parseFloat(item.retail_price || 0),
        wholesalePrice: parseFloat(item.wholesale_price || 0),
        purchasePrice: parseFloat(item.purchase_price || 0),
        alertThreshold: parseFloat(item.alert_threshold || 5),
        category: item.category || 'Général',
        isWholesale: item.is_wholesale === "1" || item.is_wholesale === 1
      }));
    } catch (e) { return []; }
  }

  async saveStockItem(item: Partial<StockItem>) {
    if (!this.currentPmeId) return;

    const payload = {
      designation: item.designation,
      category: item.category,
      sub_category: item.subCategory || '',
      quantity: item.quantity,
      unit: item.unit,
      purchase_price: item.purchasePrice || 0,
      retail_price: item.retailPrice || 0,
      wholesale_price: item.wholesalePrice || 0,
      is_wholesale: item.isWholesale ? 1 : 0,
      alert_threshold: item.alertThreshold || 5,
      pme_id: this.currentPmeId
    };

    if (item.id) {
      await ApiService.updateProduct(item.id, this.currentPmeId, payload);
    } else {
      await ApiService.createProduct(payload);
    }
    await this.fetchStock(); 
  }

  async deleteStockItem(id: string) {
    if (!this.currentPmeId) return;
    await ApiService.deleteProduct(id, this.currentPmeId);
    await this.fetchStock();
  }

  async transformProduct(fromId: string, toId: string, quantity: number, factor: number) {
    if (!this.currentPmeId) return;
    await ApiService.transformStock(this.currentPmeId, fromId, toId, quantity, factor);
    await this.fetchStock();
  }

  // --- Sales ---
  async addSale(sale: Sale) {
    if (!this.currentPmeId) return;

    const payload = { 
      sale_id: sale.id || this.generateUUID(), 
      pme_id: this.currentPmeId, 
      user_id: this.getCurrentUser()?.id, 
      total: sale.total,
      payment_type: sale.paymentType.toLowerCase(),
      customer_name: sale.customerName || 'Client Comptant', 
      items: sale.items.map(it => ({ 
        item_id: it.itemId, 
        quantity: it.quantity,
        unit_price: it.unitPrice,
        total: it.total
      })) 
    };

    try {
      await ApiService.createSale(payload);
      localStorage.removeItem(`cache_stock_${this.currentPmeId}`);
      localStorage.removeItem(`cache_sales_${this.currentPmeId}`);
      await this.fetchStock();
    } catch (e) { throw e; }
  }

  getSales(): Sale[] { if (!this.currentPmeId) return []; const cache = localStorage.getItem(`cache_sales_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  
  async fetchSales(from?: string, to?: string): Promise<Sale[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getSales(this.currentPmeId, from, to);
      // Correction du mappage pour inclure toutes les propriétés requises par l'interface Sale
      const sales: Sale[] = data.map((s: any) => ({ 
        id: s.id, 
        date: s.sale_date || s.date, 
        total: parseFloat(s.total || 0), 
        subtotal: parseFloat(s.subtotal || s.total || 0),
        taxAmount: parseFloat(s.tax_amount || 0),
        paymentType: (s.payment_type || 'CASH').toUpperCase() as any,
        author: s.vendeur || 'Système',
        authorId: s.user_id || s.author_id || 'system',
        customerName: s.customer_name || 'Client Comptant',
        items: (s.items ? (typeof s.items === 'string' ? JSON.parse(s.items) : s.items) : []).map((it: any) => ({
          itemId: it.item_id || it.itemId,
          designation: it.designation || 'Inconnu',
          quantity: parseFloat(it.quantity || 0),
          unitPrice: parseFloat(it.unit_price || it.unitPrice || 0),
          total: parseFloat(it.total || 0)
        }))
      }));
      localStorage.setItem(`cache_sales_${this.currentPmeId}`, JSON.stringify(sales));
      return sales;
    } catch (e) { return this.getSales(); }
  }

  async fetchDashboardStats() {
    if (!this.currentPmeId) return null;
    try {
      const stats = await ApiService.getDashboardStats(this.currentPmeId);
      return { 
        dailySales: parseFloat(stats.ca_jour || 0), 
        stockAlerts: parseInt(stats.alertes_stock || 0), 
        cashBalance: parseFloat(stats.cash_balance || 0) 
      };
    } catch (e) { return null; }
  }

  // --- Remote Config ---
  async fetchCompanyConfigRemote(): Promise<CompanyConfig | null> {
    if (!this.currentPmeId) return null;
    try {
      const remoteData = await ApiService.getDashboardConfig(this.currentPmeId);
      const localConfig = this.getCompanyInfo();
      
      const mergedConfig: CompanyConfig = {
        idUnique: this.currentPmeId,
        name: localConfig?.name || 'Ma PME Nexa',
        owner: localConfig?.owner || '',
        setupDate: localConfig?.setupDate || new Date().toISOString(),
        currency: (remoteData.currency || localConfig?.currency || 'FC') as 'FC' | 'USD',
        taxId: remoteData.tax_id || localConfig?.taxId || '',
        phone: remoteData.phone || localConfig?.phone || '',
        email: remoteData.email || localConfig?.email || '',
        address: remoteData.address || localConfig?.address || '',
        domain: remoteData.domain || localConfig?.domain || 'FOOD_RETAIL',
        bankDetails: remoteData.bank_details || localConfig?.bankDetails || ''
      };

      this.saveCompanyInfo(mergedConfig);
      return mergedConfig;
    } catch (e) {
      return this.getCompanyInfo();
    }
  }

  async saveCompanyConfigRemote(config: Partial<CompanyConfig>) {
    if (!this.currentPmeId) return;
    
    const payload = {
      currency: config.currency,
      tax_id: config.taxId,
      phone: config.phone,
      email: config.email,
      address: config.address,
      domain: config.domain,
      bank_details: config.bankDetails
    };

    await ApiService.saveDashboardConfig(this.currentPmeId, payload);
    const updated = { ...this.getCompanyInfo()!, ...config };
    this.saveCompanyInfo(updated);
  }

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
  getCashFlow(): CashFlow[] { return JSON.parse(localStorage.getItem(`cache_cash_${this.currentPmeId}`) || '[]'); }
  getCashBalance(): number { const flows = this.getCashFlow(); return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0); }
  recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) { const flows = this.getCashFlow(); const newFlow = { id: this.generateUUID(), date: new Date().toISOString(), type, category, description, amount, author: this.getCurrentUser()?.name || 'system' }; localStorage.setItem(`cache_cash_${this.currentPmeId}`, JSON.stringify([newFlow, ...flows])); }
  getCredits() { return JSON.parse(localStorage.getItem(`gestoalim_credits_${this.currentPmeId}`) || '[]'); }
  async fetchCredits() { return this.getCredits(); }
  async repayCredit(id: string, amount: number) { const credits = this.getCredits().map((c: any) => { if (c.id === id) { const rem = Math.max(0, c.remainingAmount - amount); return { ...c, remainingAmount: rem, status: rem === 0 ? 'PAID' : 'PENDING' }; } return c; }); localStorage.setItem(`gestoalim_credits_${this.currentPmeId}`, JSON.stringify(credits)); this.recordCashFlow(amount, 'IN', 'Remboursement', `Crédit ${id}`); }
  async fetchUsers() { if (!this.currentPmeId) return []; const data = await ApiService.getUsers(this.currentPmeId); const mapped = data.map(u => ({ id: u.id, name: u.name, role: u.role, pin: '', permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions })); this.saveUsers(mapped); return mapped; }
  getWeeklySalesData() { const sales = this.getSales(); const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']; const now = new Date(); return days.map((day, index) => { const d = new Date(now); d.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) + index); const dateStr = d.toISOString().split('T')[0]; const amount = sales.filter(s => s.date.startsWith(dateStr)).reduce((acc, s) => acc + s.total, 0); return { name: day, amount }; }); }
  getInventories(): InventoryReport[] { if (!this.currentPmeId) return []; const cache = localStorage.getItem(`cache_inventory_${this.currentPmeId}`); return cache ? JSON.parse(cache) : []; }
  addInventory(report: InventoryReport) { if (!this.currentPmeId) return; const reports = this.getInventories(); localStorage.setItem(`cache_inventory_${this.currentPmeId}`, JSON.stringify([report, ...reports])); }
  updateStock(stock: StockItem[]) { if (!this.currentPmeId) return; localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(stock)); }
  exportAllDataAsJSON() { if (!this.currentPmeId) return; const data = { config: this.getCompanyInfo(), stock: this.getStock(), sales: this.getSales(), credits: this.getCredits(), cash: this.getCashFlow(), inventory: this.getInventories(), users: this.getUsers(), subcategories: this.getSubCategories() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `nexapme_export_${this.currentPmeId}.json`; a.click(); URL.revokeObjectURL(url); }
  importDataFromJSON(jsonText: string) { try { const data = JSON.parse(jsonText); if (data.config) this.saveCompanyInfo(data.config); if (data.stock && this.currentPmeId) localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(data.stock)); window.location.reload(); } catch (e) { alert("Erreur importation."); } }
  getOperations() { return JSON.parse(localStorage.getItem(`nexapme_operations_${this.currentPmeId}`) || '[]'); }
  saveOperations(ops: any) { localStorage.setItem(`nexapme_operations_${this.currentPmeId}`, JSON.stringify(ops)); }
  getAppointments() { return JSON.parse(localStorage.getItem(`nexapme_appointments_${this.currentPmeId}`) || '[]'); }
  saveAppointments(a: any) { localStorage.setItem(`nexapme_appointments_${this.currentPmeId}`, JSON.stringify(a)); }
  getQuotes() { return JSON.parse(localStorage.getItem(`nexapme_quotes_${this.currentPmeId}`) || '[]'); }
  saveQuotes(q: any) { localStorage.setItem(`nexapme_quotes_${this.currentPmeId}`, JSON.stringify(q)); }
  getSubCategories() { return JSON.parse(localStorage.getItem(`nexapme_subcategories_${this.currentPmeId}`) || '[]'); }
  saveSubCategories(s: any) { localStorage.setItem(`nexapme_subcategories_${this.currentPmeId}`, JSON.stringify(s)); }
}
export const storageService = new StorageService();
