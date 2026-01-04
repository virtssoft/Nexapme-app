
import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, LicenseInfo, LicenseType, View, Operation, Appointment, Quote } from '../types';
import { ApiService } from './ApiService';

interface SyncItem {
  id: string;
  type: 'SALE' | 'EXPENSE' | 'STOCK' | 'CREDIT_REPAY';
  data: any;
  timestamp: number;
}

class StorageService {
  private currentPmeId: string | null = null;
  private isSyncing = false;

  constructor() {
    this.currentPmeId = localStorage.getItem('nexapme_active_id');
    setInterval(() => this.processSyncQueue(), 30000);
    window.addEventListener('online', () => this.processSyncQueue());
  }

  setActiveCompany(id: string) {
    this.currentPmeId = id;
    localStorage.setItem('nexapme_active_id', id);
  }

  getActiveCompanyId() { return this.currentPmeId; }
  generateUUID() { return crypto.randomUUID(); }

  private notifyDataChanged() {
    window.dispatchEvent(new CustomEvent('nexa_data_updated'));
  }

  getPendingCount() {
    if (!this.currentPmeId) return 0;
    return this.getSyncQueue().length;
  }

  private getSyncQueue(): SyncItem[] {
    return JSON.parse(localStorage.getItem(`sync_queue_${this.currentPmeId}`) || '[]');
  }

  private addToSyncQueue(type: SyncItem['type'], data: any) {
    const queue = this.getSyncQueue();
    queue.push({ id: this.generateUUID(), type, data, timestamp: Date.now() });
    localStorage.setItem(`sync_queue_${this.currentPmeId}`, JSON.stringify(queue));
    this.notifyDataChanged();
  }

  async processSyncQueue() {
    if (this.isSyncing || !this.currentPmeId) return;
    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    const remainingQueue: SyncItem[] = [];
    
    for (const item of queue) {
      try {
        switch (item.type) {
          case 'SALE': await ApiService.createSale(item.data); break;
          case 'EXPENSE': await ApiService.recordExpense(item.data); break;
          case 'CREDIT_REPAY': await ApiService.repayCredit(item.data); break;
          case 'STOCK': 
            if (item.data.id) await ApiService.updateProduct(item.data.id, this.currentPmeId, item.data);
            else await ApiService.createProduct({ ...item.data, pme_id: this.currentPmeId });
            break;
        }
      } catch (e: any) {
        remainingQueue.push(item); 
      }
    }

    localStorage.setItem(`sync_queue_${this.currentPmeId}`, JSON.stringify(remainingQueue));
    this.isSyncing = false;
    
    if (remainingQueue.length < queue.length) {
      await Promise.all([this.fetchStock(), this.fetchSales(), this.fetchCashLedger()]);
    }
  }

  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    const allPmes = await ApiService.getAdminPmes();
    const foundPme = allPmes.find((p: any) => p.license_key === key);
    if (!foundPme) throw new Error("Clé de licence introuvable.");
    
    this.setActiveCompany(foundPme.id);
    const companyInfo: CompanyConfig = {
      idUnique: foundPme.id, 
      name: foundPme.name, 
      owner: foundPme.owner_name,
      currency: foundPme.currency || 'FC', 
      exchange_rate: parseFloat(foundPme.exchange_rate || 2850),
      tax_id: foundPme.tax_id, 
      address: foundPme.address,
      phone: foundPme.phone,
      email: foundPme.email,
      domain: foundPme.domain as any,
      setupDate: foundPme.created_at || new Date().toISOString()
    };
    this.saveCompanyInfo(companyInfo);
    
    const license: LicenseInfo = { key, idUnique: foundPme.id, pmeName: foundPme.name, type: foundPme.license_type as LicenseType, expiryDate: foundPme.expiry_date };
    localStorage.setItem('nexapme_active_license_key', key);
    localStorage.setItem('nexapme_active_license_info', JSON.stringify(license));
    return license;
  }

  async loginRemote(name: string, pin: string) {
    const res = await ApiService.login(name, pin);
    if (res.token) localStorage.setItem('nexapme_jwt', res.token);
    const user: UserProfile = { id: res.user.id, name: res.user.name, role: res.user.role, pin: '', permissions: this.getDefaultPermissions(res.user.role) };
    this.setCurrentUser(user);
    return { user };
  }

  async fetchUsers() {
    if (!this.currentPmeId) return [];
    const data = await ApiService.getUsers(this.currentPmeId);
    localStorage.setItem(`nexapme_users_${this.currentPmeId}`, JSON.stringify(data));
    this.notifyDataChanged();
    return data;
  }

  async addUser(userData: { name: string, role: string, pin: string, permissions: string }) {
    if (!this.currentPmeId) return;
    const payload = { ...userData, pme_id: this.currentPmeId, id: `USR-${Math.random().toString(36).substr(2, 5).toUpperCase()}` };
    await ApiService.createUser(payload);
    await this.fetchUsers();
  }

  async removeUser(id: string) {
    await ApiService.deleteUser(id);
    await this.fetchUsers();
  }

  getCashFlow(): CashFlow[] { return JSON.parse(localStorage.getItem(`cache_cash_${this.currentPmeId}`) || '[]'); }
  
  async fetchCashLedger(): Promise<CashFlow[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getCashLedger(this.currentPmeId);
      const flows = data.map((f: any) => ({
        id: f.id, date: f.created_at || f.date, type: f.type, category: f.category,
        description: f.description, amount: parseFloat(f.amount), author: f.author_name,
        balance_after: parseFloat(f.balance_after || 0)
      }));
      localStorage.setItem(`cache_cash_${this.currentPmeId}`, JSON.stringify(flows));
      this.notifyDataChanged();
      return flows;
    } catch (e) { return this.getCashFlow(); }
  }

  async recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) {
    if (!this.currentPmeId) return;
    const payload = { pme_id: this.currentPmeId, amount, type, category, description, user_id: this.getCurrentUser()?.id };
    try {
      await ApiService.recordExpense(payload);
      await this.fetchCashLedger();
    } catch (e) {
      if (type === 'OUT') this.addToSyncQueue('EXPENSE', payload);
    }
  }

  getCashBalance(): number {
    const flows = this.getCashFlow();
    if (flows.length > 0 && (flows[0] as any).balance_after !== undefined) return (flows[0] as any).balance_after;
    return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0);
  }

  getCredits(): Credit[] { return JSON.parse(localStorage.getItem(`cache_credits_${this.currentPmeId}`) || '[]'); }
  
  async fetchCredits(): Promise<Credit[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getCredits(this.currentPmeId);
      const credits = data.map((c: any) => ({
        id: c.id, customerName: c.customer_name, date: c.created_at,
        remainingAmount: parseFloat(c.remaining_amount || 0), initialAmount: parseFloat(c.initial_amount || 0),
        status: c.status, history: (c.payments || []).map((p: any) => ({ date: p.created_at, amount: parseFloat(p.amount), note: p.note, authorId: p.user_id }))
      }));
      localStorage.setItem(`cache_credits_${this.currentPmeId}`, JSON.stringify(credits));
      this.notifyDataChanged();
      return credits;
    } catch (e) { return this.getCredits(); }
  }

  async repayCredit(id: string, amount: number) {
    const payload = { pme_id: this.currentPmeId, credit_id: id, amount, user_id: this.getCurrentUser()?.id };
    try {
      await ApiService.repayCredit(payload);
      await Promise.all([this.fetchCredits(), this.fetchCashLedger()]);
    } catch (e) {
      this.addToSyncQueue('CREDIT_REPAY', payload);
    }
  }

  getStock(): StockItem[] { return JSON.parse(localStorage.getItem(`cache_stock_${this.currentPmeId}`) || '[]'); }
  
  async fetchStock(): Promise<StockItem[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getStock(this.currentPmeId);
      const stock = data.map((i: any) => ({
        id: i.id, designation: i.designation, quantity: parseFloat(i.quantity), unit: i.unit,
        retailPrice: parseFloat(i.retail_price), wholesalePrice: parseFloat(i.wholesale_price),
        purchasePrice: parseFloat(i.purchase_price), alertThreshold: parseFloat(i.alert_threshold),
        category: i.category, isWholesale: i.is_wholesale == 1
      }));
      localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(stock));
      this.notifyDataChanged();
      return stock;
    } catch (e) { return this.getStock(); }
  }

  async saveStockItem(item: Partial<StockItem>) {
    try {
      if (item.id) await ApiService.updateProduct(item.id, this.currentPmeId!, item);
      else await ApiService.createProduct({ ...item, pme_id: this.currentPmeId });
      await this.fetchStock();
    } catch (e) {
      this.addToSyncQueue('STOCK', item);
    }
  }

  async deleteStockItem(id: string) {
    if (!this.currentPmeId) return;
    try {
      await ApiService.deleteProduct(id, this.currentPmeId);
      await this.fetchStock();
    } catch(e) { console.error("Delete failed"); }
  }

  getSales(): Sale[] { return JSON.parse(localStorage.getItem(`cache_sales_${this.currentPmeId}`) || '[]'); }
  
  async addSale(sale: Sale) {
    if (!this.currentPmeId) return;
    const payload = { 
      sale_id: sale.id || this.generateUUID(), pme_id: this.currentPmeId, user_id: sale.authorId, 
      total: sale.total, payment_type: sale.paymentType.toLowerCase(), customer_name: sale.customerName || 'Client Comptant', 
      items: sale.items.map(it => ({ item_id: it.itemId, quantity: it.quantity, unit_price: it.unitPrice, total: it.total })) 
    };
    try {
      await ApiService.createSale(payload);
      await Promise.all([this.fetchStock(), this.fetchSales(), this.fetchCashLedger()]);
    } catch (e) {
      this.addToSyncQueue('SALE', payload);
    }
  }

  async fetchSales(from?: string, to?: string): Promise<Sale[]> {
    if (!this.currentPmeId) return [];
    try {
      const data = await ApiService.getSales(this.currentPmeId, from, to);
      const sales: Sale[] = data.map((s: any) => ({
        id: s.id, date: s.sale_date, total: parseFloat(s.total || 0), 
        subtotal: parseFloat(s.subtotal || s.total || 0), taxAmount: parseFloat(s.tax_amount || 0),
        paymentType: (s.payment_type || 'CASH').toUpperCase() as any,
        author: s.vendeur || 'Inconnu', authorId: s.user_id || '',
        customerName: s.customer_name || 'Client', items: []
      }));
      localStorage.setItem(`cache_sales_${this.currentPmeId}`, JSON.stringify(sales));
      this.notifyDataChanged();
      return sales;
    } catch (e) { return this.getSales(); }
  }

  getCurrentUser(): UserProfile | null { return JSON.parse(localStorage.getItem('nexapme_current_session') || 'null'); }
  setCurrentUser(u: UserProfile | null) { localStorage.setItem('nexapme_current_session', JSON.stringify(u)); }
  getLicense() { return JSON.parse(localStorage.getItem('nexapme_active_license_info') || 'null'); }
  getCompanyInfo(): CompanyConfig | null { return JSON.parse(localStorage.getItem(`nexapme_${this.currentPmeId}_config`) || 'null'); }
  saveCompanyInfo(c: CompanyConfig) { localStorage.setItem(`nexapme_${this.currentPmeId}_config`, JSON.stringify(c)); }
  
  getExchangeRate() { 
    const config = this.getCompanyInfo();
    return parseFloat(config?.exchange_rate as any) || 2850; 
  }
  
  updateExchangeRate(r: number) { 
    const config = this.getCompanyInfo();
    if (config) {
      config.exchange_rate = r;
      this.saveCompanyInfo(config);
    }
    localStorage.setItem('nexapme_rate', r.toString()); 
    this.notifyDataChanged(); 
  }
  
  formatFC(a: any) { return new Intl.NumberFormat('fr-FR').format(parseFloat(a || 0)) + ' FC'; }
  
  formatUSD(a: any) { 
    const rate = this.getExchangeRate();
    const amount = parseFloat(a || 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / rate); 
  }

  getDefaultPermissions(r: string): View[] { return r === 'MANAGER' ? Object.values(View) : [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY]; }
  
  getWeeklySalesData() {
    const sales = this.getSales();
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const now = new Date();
    return days.map((day, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (now.getDay() || 7) + 1 + i);
      const str = d.toISOString().split('T')[0];
      const amount = sales.filter(s => s.date.startsWith(str)).reduce((acc, s) => acc + s.total, 0);
      return { name: day, amount };
    });
  }

  clearLicense() { localStorage.clear(); window.location.reload(); }
  
  async fetchDashboardStats() { return await ApiService.getDashboardStats(this.currentPmeId!); }
  
  async fetchCompanyConfigRemote() { 
    const data: any = await ApiService.getDashboardConfig(this.currentPmeId!);
    if (data) {
      const config: CompanyConfig = {
        idUnique: data.pme_id || this.currentPmeId,
        name: data.name || data.pme_name || '',
        owner: data.owner_name || '',
        currency: data.currency || 'FC',
        exchange_rate: parseFloat(data.exchange_rate || 2850),
        tax_id: data.tax_id || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        domain: data.domain || 'Alimentation',
        setupDate: data.created_at || new Date().toISOString()
      };
      this.saveCompanyInfo(config);
      return config;
    }
    return this.getCompanyInfo();
  }
  
  async saveCompanyConfigRemote(c: CompanyConfig) { 
    const payload = {
      pme_id: this.currentPmeId,
      currency: c.currency,
      exchange_rate: c.exchange_rate,
      tax_id: c.tax_id,
      phone: c.phone,
      email: c.email,
      address: c.address,
      domain: c.domain,
      name: c.name
    };
    await ApiService.saveDashboardConfig(this.currentPmeId!, payload); 
    this.saveCompanyInfo(c);
    this.notifyDataChanged(); 
  }
  
  async fetchInventory(t?: any) { return await ApiService.getInventory(this.currentPmeId!, t); }
  getInventories(): InventoryReport[] { return JSON.parse(localStorage.getItem(`cache_inv_${this.currentPmeId}`) || '[]'); }
  addInventory(r: InventoryReport) { localStorage.setItem(`cache_inv_${this.currentPmeId}`, JSON.stringify([r, ...this.getInventories()])); this.notifyDataChanged(); }
  updateStock(s: StockItem[]) { localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(s)); this.notifyDataChanged(); }
  getUsers() { return JSON.parse(localStorage.getItem(`nexapme_users_${this.currentPmeId}`) || '[]'); }
  saveUsers(u: any) { localStorage.setItem(`nexapme_users_${this.currentPmeId}`, JSON.stringify(u)); this.notifyDataChanged(); }
  async transformProduct(fromId: string, toId: string, quantity: number, factor: number) {
    await ApiService.transformStock(this.currentPmeId!, fromId, toId, quantity, factor);
    await this.fetchStock();
  }

  // Added missing Operations methods
  getOperations(): Operation[] {
    return JSON.parse(localStorage.getItem(`nexapme_ops_${this.currentPmeId}`) || '[]');
  }

  saveOperations(ops: Operation[]) {
    localStorage.setItem(`nexapme_ops_${this.currentPmeId}`, JSON.stringify(ops));
    this.notifyDataChanged();
  }

  // Added missing Appointments methods
  getAppointments(): Appointment[] {
    return JSON.parse(localStorage.getItem(`nexapme_apps_${this.currentPmeId}`) || '[]');
  }

  saveAppointments(apps: Appointment[]) {
    localStorage.setItem(`nexapme_apps_${this.currentPmeId}`, JSON.stringify(apps));
    this.notifyDataChanged();
  }

  // Added missing Quotes methods
  getQuotes(): Quote[] {
    return JSON.parse(localStorage.getItem(`nexapme_quotes_${this.currentPmeId}`) || '[]');
  }

  saveQuotes(qs: Quote[]) {
    localStorage.setItem(`nexapme_quotes_${this.currentPmeId}`, JSON.stringify(qs));
    this.notifyDataChanged();
  }
}
export const storageService = new StorageService();
