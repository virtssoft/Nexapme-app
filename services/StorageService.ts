
// services/StorageService.ts

import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, UserRole, LicenseInfo, LicenseType, View, Operation, Appointment, Quote } from '../types';
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

  /**
   * REFRESH GLOBAL : Recharge absolument toutes les données depuis le Cloud.
   * Appelé après chaque opération importante pour garantir la cohérence.
   */
  async refreshAllData() {
    if (!this.currentPmeId || !navigator.onLine) {
      this.notifyDataChanged();
      return;
    }
    
    try {
      await Promise.allSettled([
        this.fetchStock(),
        this.fetchSales(),
        this.fetchCashLedger(),
        this.fetchCredits(),
        this.fetchCompanyConfigRemote(),
        ApiService.getDashboardStats(this.currentPmeId)
      ]);
    } catch (e) {
      console.error("Erreur lors du rafraîchissement global", e);
    } finally {
      this.notifyDataChanged();
    }
  }

  // FIX: Added missing fetchCompanyConfigRemote method (Error line 49)
  async fetchCompanyConfigRemote(): Promise<CompanyConfig | null> {
    if (!this.currentPmeId) return null;
    try {
      const data = await ApiService.getDashboardConfig(this.currentPmeId);
      const config: CompanyConfig = {
        idUnique: data.id || this.currentPmeId,
        name: data.name || '',
        owner: data.owner_name || '',
        currency: data.currency || 'FC',
        exchange_rate: parseFloat(data.exchange_rate) || 2850,
        tax_id: data.tax_id,
        phone: data.phone,
        address: data.address,
        email: data.email,
        domain: data.domain,
        setupDate: data.created_at
      };
      this.saveCompanyInfo(config);
      return config;
    } catch (e) {
      return this.getCompanyInfo();
    }
  }

  // FIX: Added missing saveCompanyConfigRemote method
  async saveCompanyConfigRemote(config: CompanyConfig) {
    if (!this.currentPmeId) return;
    await ApiService.saveDashboardConfig(this.currentPmeId, {
      name: config.name,
      owner_name: config.owner,
      currency: config.currency,
      exchange_rate: config.exchange_rate,
      tax_id: config.tax_id,
      phone: config.phone,
      address: config.address,
      email: config.email,
      domain: config.domain
    });
    this.saveCompanyInfo(config);
    this.notifyDataChanged();
  }

  // FIX: Added missing getDefaultPermissions method (Error line 143)
  private getDefaultPermissions(role: UserRole): View[] {
    if (role === 'MANAGER') return Object.values(View);
    return [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY];
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
    if (this.isSyncing || !this.currentPmeId || !navigator.onLine) return;
    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    const remainingQueue: SyncItem[] = [];
    let hasSuccess = false;
    
    for (const item of queue) {
      try {
        switch (item.type) {
          case 'SALE': await ApiService.createSale(item.data); break;
          case 'EXPENSE': await ApiService.recordExpense(item.data); break;
          case 'CREDIT_REPAY': await ApiService.repayCredit(item.data); break;
          case 'STOCK': 
            if (item.data.id) {
              await ApiService.updateProduct(item.data.id, this.currentPmeId, item.data);
            } else {
              await ApiService.createProduct(item.data);
            }
            break;
        }
        hasSuccess = true;
      } catch (e: any) {
        console.error(`Sync failed for ${item.type}`, e);
        remainingQueue.push(item); 
      }
    }

    localStorage.setItem(`sync_queue_${this.currentPmeId}`, JSON.stringify(remainingQueue));
    this.isSyncing = false;
    
    if (hasSuccess) {
      await this.refreshAllData();
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

  // FIX: Added missing getUsers method
  getUsers(): UserProfile[] {
    return JSON.parse(localStorage.getItem(`nexapme_users_${this.currentPmeId}`) || '[]');
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
      return flows;
    } catch (e) { return this.getCashFlow(); }
  }

  async recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) {
    if (!this.currentPmeId) return;
    const payload = { pme_id: this.currentPmeId, amount, type, category, description, user_id: this.getCurrentUser()?.id };
    try {
      await ApiService.recordExpense(payload);
      await this.refreshAllData();
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
      return credits;
    } catch (e) { return this.getCredits(); }
  }

  async repayCredit(id: string, amount: number) {
    const payload = { pme_id: this.currentPmeId, credit_id: id, amount, user_id: this.getCurrentUser()?.id };
    try {
      await ApiService.repayCredit(payload);
      await this.refreshAllData();
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
      return stock;
    } catch (e) { return this.getStock(); }
  }

  private mapToApiPayload(item: Partial<StockItem>) {
    return {
      pme_id: this.currentPmeId,
      id: item.id,
      designation: item.designation,
      category: item.category,
      sub_category: item.subCategory || '',
      quantity: item.quantity ?? 0,
      unit: item.unit || 'pcs',
      purchase_price: item.purchasePrice ?? 0,
      retail_price: item.retailPrice ?? 0,
      wholesale_price: item.wholesalePrice ?? 0,
      alert_threshold: item.alertThreshold ?? 0,
      is_wholesale: item.isWholesale ? 1 : 0,
      expiry_date: item.expiryDate || null
    };
  }

  async saveStockItem(item: Partial<StockItem>) {
    if (!this.currentPmeId) return;
    const apiPayload = this.mapToApiPayload(item);
    try {
      if (item.id) {
        await ApiService.updateProduct(item.id, this.currentPmeId, apiPayload);
      } else {
        await ApiService.createProduct(apiPayload);
      }
      await this.refreshAllData();
    } catch (e) {
      this.addToSyncQueue('STOCK', apiPayload);
    }
  }

  async deleteStockItem(id: string) {
    if (!this.currentPmeId) return;
    try {
      await ApiService.deleteProduct(id, this.currentPmeId);
      await this.refreshAllData();
    } catch(e) { console.error("Delete failed", e); }
  }

  /**
   * Transformation sécurisée Gros -> Détail sans perte de valeurs
   */
  async transformProduct(sourceId: string, detailItem: Partial<StockItem>, quantityToTransform: number, factor: number) {
    if (!this.currentPmeId) return;

    // 1. On cherche si l'article de détail existe déjà
    const currentStock = this.getStock();
    let targetId = '';
    const existingDetail = currentStock.find(i => 
      !i.isWholesale && i.designation.trim().toLowerCase() === detailItem.designation?.trim().toLowerCase()
    );

    const apiPayload = this.mapToApiPayload({ ...detailItem, isWholesale: false });

    if (existingDetail) {
      targetId = existingDetail.id;
      apiPayload.id = targetId;
      // Mise à jour des infos (prix, etc.) avant le transfert
      await ApiService.updateProduct(targetId, this.currentPmeId, apiPayload);
    } else {
      // Création forcée du nouvel article avec les bons prix
      const res: any = await ApiService.createProduct({
        ...apiPayload,
        quantity: 0 // Initialisé à 0, transformStock s'occupe de l'ajout
      });
      
      targetId = res?.id || res?.data?.id;
      
      if (!targetId) {
        // Fallback robustesse : recherche par désignation dans un stock frais
        const freshStock = await this.fetchStock();
        const created = freshStock.find(i => i.designation.trim().toLowerCase() === detailItem.designation?.trim().toLowerCase());
        targetId = created?.id || '';
      }
    }

    if (!targetId) throw new Error("Impossible de localiser l'article de destination.");

    // 2. Appel de la transformation transactionnelle Cloud (Transfert de quantité)
    await ApiService.transformStock(
      this.currentPmeId,
      sourceId,
      targetId,
      quantityToTransform,
      factor
    );

    // 3. Rafraîchir tout
    await this.refreshAllData();
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
      await this.refreshAllData();
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
      return sales;
    } catch (e) { return this.getSales(); }
  }

  // FIX: Added missing getWeeklySalesData method used in Dashboard.tsx
  getWeeklySalesData() {
    const sales = this.getSales();
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const data = days.map(name => ({ name, amount: 0 }));
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    sales.forEach(s => {
      const d = new Date(s.date);
      if (d >= lastWeek) {
        data[d.getDay()].amount += s.total;
      }
    });
    return data;
  }

  // FIX: Added missing getInventories, fetchInventory, addInventory, updateStock methods for Inventory.tsx
  getInventories(): InventoryReport[] { return JSON.parse(localStorage.getItem(`cache_inv_${this.currentPmeId}`) || '[]'); }
  
  async fetchInventory(type?: 'wholesale' | 'retail'): Promise<StockItem[]> {
    if (!this.currentPmeId) return [];
    const data = await ApiService.getInventory(this.currentPmeId, type);
    return data.map((i: any) => ({
      id: i.id, designation: i.designation, quantity: parseFloat(i.quantity), unit: i.unit,
      retailPrice: parseFloat(i.retail_price), wholesalePrice: parseFloat(i.wholesale_price),
      purchasePrice: parseFloat(i.purchase_price), alertThreshold: parseFloat(i.alert_threshold),
      category: i.category, isWholesale: i.is_wholesale == 1
    }));
  }

  addInventory(report: InventoryReport) {
    const reports = this.getInventories();
    const updated = [report, ...reports];
    localStorage.setItem(`cache_inv_${this.currentPmeId}`, JSON.stringify(updated));
    this.notifyDataChanged();
  }

  updateStock(items: StockItem[]) {
    localStorage.setItem(`cache_stock_${this.currentPmeId}`, JSON.stringify(items));
    this.notifyDataChanged();
  }

  // FIX: Added missing operation/appointment/quote methods
  getOperations(): Operation[] { return JSON.parse(localStorage.getItem(`ops_${this.currentPmeId}`) || '[]'); }
  saveOperations(ops: Operation[]) { 
    localStorage.setItem(`ops_${this.currentPmeId}`, JSON.stringify(ops)); 
    this.notifyDataChanged();
  }

  getAppointments(): Appointment[] { return JSON.parse(localStorage.getItem(`apps_${this.currentPmeId}`) || '[]'); }
  saveAppointments(apps: Appointment[]) { 
    localStorage.setItem(`apps_${this.currentPmeId}`, JSON.stringify(apps)); 
    this.notifyDataChanged();
  }

  getQuotes(): Quote[] { return JSON.parse(localStorage.getItem(`quotes_${this.currentPmeId}`) || '[]'); }
  saveQuotes(quotes: Quote[]) { 
    localStorage.setItem(`quotes_${this.currentPmeId}`, JSON.stringify(quotes)); 
    this.notifyDataChanged();
  }

  getCurrentUser(): UserProfile | null { return JSON.parse(localStorage.getItem('nexapme_current_session') || 'null'); }
  setCurrentUser(u: UserProfile | null) { localStorage.setItem('nexapme_current_session', JSON.stringify(u)); }
  getLicense() { return JSON.parse(localStorage.getItem('nexapme_active_license_info') || 'null'); }
  
  // FIX: Added clearLicense method used in App.tsx and Settings.tsx
  clearLicense() {
    localStorage.removeItem('nexapme_active_license_key');
    localStorage.removeItem('nexapme_active_license_info');
    localStorage.removeItem('nexapme_active_id');
    this.currentPmeId = null;
    this.notifyDataChanged();
  }

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
  
  // FIX: Completed formatUSD method and fixed Intl.NumberFormat usage (Error line 399)
  formatUSD(a: any) { 
    const rate = this.getExchangeRate();
    const amount = (parseFloat(a || 0) / rate).toFixed(2);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(amount));
  }
}

// FIX: Export storageService instance to resolve multiple module errors
export const storageService = new StorageService();
