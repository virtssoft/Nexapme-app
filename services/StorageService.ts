
import { STORAGE_KEYS, INITIAL_STOCK } from '../constants';
import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, PMEEntry, LicenseInfo, View, SubCategory, Operation, Appointment, Quote } from '../types';
import { ApiService } from './ApiService';

class StorageService {
  private currentCompanyId: string | null = null;
  private ADMIN_CACHE_KEY = 'nexapme_admin_pme_cache';

  constructor() {
    this.currentCompanyId = localStorage.getItem('nexapme_active_id');
  }

  setActiveCompany(id: string) {
    this.currentCompanyId = id;
    localStorage.setItem('nexapme_active_id', id);
  }

  getActiveCompanyId(): string | null {
    return this.currentCompanyId;
  }

  // --- Méthodes de Session ---
  async validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
    if (key === 'TRIAL_MODE') {
      return { key, type: 'TRIAL', pmeName: 'ENTREPRISE D\'ESSAI', idUnique: 'TRIAL_PME' };
    }
    if (key === 'nexaPME2025') {
      return { key, type: 'ADMIN', pmeName: 'ADMINISTRATION', idUnique: 'ADMIN' };
    }
    if (key === 'nexaUNN2025') {
      return { key, type: 'UNIVERSAL', pmeName: 'MASTER PME', idUnique: 'MASTER_PME' };
    }

    try {
      const res = await ApiService.validateLicense(key);
      if (res && res.id) {
        return {
          key: key,
          type: res.license_type,
          expiryDate: res.expiry_date,
          pmeName: res.name,
          idUnique: res.id
        };
      }
      return null;
    } catch (e) {
      console.warn("Serveur injoignable, vérification du cache local...");
      // Optionnel: On pourrait vérifier si la clé est dans le cache admin ici
      return null;
    }
  }

  async loginRemote(pme_id: string, user_id: string, pin: string): Promise<{user: UserProfile, token: string} | null> {
    if (pme_id === 'TRIAL_PME' || pme_id === 'ADMIN') {
        const user: UserProfile = { id: user_id, name: 'Utilisateur Test', role: 'MANAGER', pin };
        localStorage.setItem('nexapme_current_session', JSON.stringify(user));
        return { user, token: 'local-session-token' };
    }

    try {
      const res = await ApiService.login(pme_id, user_id, pin);
      localStorage.setItem('nexapme_jwt', res.token);
      const user = { id: res.user.id, name: res.user.name, role: res.user.role, pin };
      localStorage.setItem('nexapme_current_session', JSON.stringify(user));
      return { user, token: res.token };
    } catch (e) {
      return null;
    }
  }

  // --- Gestion du Stock ---
  getStock(): StockItem[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_stock`);
    return cache ? JSON.parse(cache) : [];
  }

  updateStock(items: StockItem[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_stock`, JSON.stringify(items));
  }

  async fetchStock(): Promise<StockItem[]> {
    if (!this.currentCompanyId || this.currentCompanyId === 'TRIAL_PME') return this.getStock();
    try {
      const remote = await ApiService.getStock(this.currentCompanyId);
      const formatted = remote.map((item: any) => ({
        id: item.id,
        designation: item.designation,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        retailPrice: parseFloat(item.retail_price),
        category: item.category || 'Général',
        purchasePrice: parseFloat(item.purchase_price || 0),
        alertThreshold: 5,
        isWholesale: item.is_wholesale === "1" || item.is_wholesale === true
      }));
      localStorage.setItem(`nexapme_${this.currentCompanyId}_stock`, JSON.stringify(formatted));
      return formatted;
    } catch (e) {
      return this.getStock();
    }
  }

  async saveStockItem(item: Partial<StockItem>) {
    if (!this.currentCompanyId) return;
    if (this.currentCompanyId === 'TRIAL_PME') {
        const stock = this.getStock();
        const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) } as StockItem;
        this.updateStock([...stock, newItem]);
        return { success: true };
    }
    const payload = {
      ...item,
      pme_id: this.currentCompanyId,
      retail_price: item.retailPrice,
      purchase_price: item.purchasePrice,
      is_wholesale: item.isWholesale ? 1 : 0
    };
    return await ApiService.createStock(payload);
  }

  // --- Espace Admin (Avec Fallback Local) ---
  async getPmeListRemote(): Promise<PMEEntry[]> {
    try {
      const remote = await ApiService.getPmeList();
      localStorage.setItem(this.ADMIN_CACHE_KEY, JSON.stringify(remote));
      return remote;
    } catch (e) {
      console.warn("Utilisation du cache Admin local");
      const cache = localStorage.getItem(this.ADMIN_CACHE_KEY);
      return cache ? JSON.parse(cache) : [];
    }
  }

  async createPmeRemote(pmeData: any) {
    try {
      const res = await ApiService.createPme(pmeData);
      // Rafraîchir le cache après succès
      await this.getPmeListRemote();
      return res;
    } catch (e) {
      // Fallback: Enregistrer en local pour ne pas bloquer l'utilisateur
      const cache = localStorage.getItem(this.ADMIN_CACHE_KEY);
      const list = cache ? JSON.parse(cache) : [];
      const newLocalPme = {
        ...pmeData,
        idUnique: 'LOCAL-' + Math.random().toString(36).substr(2, 5),
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(this.ADMIN_CACHE_KEY, JSON.stringify([newLocalPme, ...list]));
      console.info("PME enregistrée localement (Serveur indisponible)");
      return newLocalPme;
    }
  }

  async updatePmeRemote(id: string, pmeData: any) {
    try {
      const res = await ApiService.updatePme(id, pmeData);
      await this.getPmeListRemote();
      return res;
    } catch (e) {
      const cache = localStorage.getItem(this.ADMIN_CACHE_KEY);
      if (cache) {
        const list = JSON.parse(cache) as PMEEntry[];
        const updated = list.map(p => p.idUnique === id ? { ...p, ...pmeData } : p);
        localStorage.setItem(this.ADMIN_CACHE_KEY, JSON.stringify(updated));
      }
      return { success: true, local: true };
    }
  }

  async deletePmeRemote(id: string) {
    try {
      await ApiService.deletePme(id);
      await this.getPmeListRemote();
    } catch (e) {
      const cache = localStorage.getItem(this.ADMIN_CACHE_KEY);
      if (cache) {
        const list = JSON.parse(cache) as PMEEntry[];
        const updated = list.filter(p => p.idUnique !== id);
        localStorage.setItem(this.ADMIN_CACHE_KEY, JSON.stringify(updated));
      }
    }
  }

  // --- Utilitaires de Formatage ---
  getExchangeRate(): number {
    const rate = localStorage.getItem(`nexapme_${this.currentCompanyId}_rate`);
    return rate ? parseFloat(rate) : 2850;
  }

  updateExchangeRate(rate: number): void {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_rate`, rate.toString());
  }

  formatFC(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
  }

  formatUSD(amountFC: number): string {
    const rate = this.getExchangeRate();
    const usd = amountFC / rate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd);
  }

  getCurrentUser(): UserProfile | null {
    const session = localStorage.getItem('nexapme_current_session');
    return session ? JSON.parse(session) : null;
  }

  setCurrentUser(user: UserProfile | null) {
    if (user) localStorage.setItem('nexapme_current_session', JSON.stringify(user));
    else localStorage.removeItem('nexapme_current_session');
  }

  getCompanyInfo(): CompanyConfig | null {
    if (!this.currentCompanyId) return null;
    const config = localStorage.getItem(`nexapme_${this.currentCompanyId}_config`);
    return config ? JSON.parse(config) : null;
  }

  saveCompanyInfo(config: CompanyConfig) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_config`, JSON.stringify(config));
  }

  getUser(): string {
    return this.getCurrentUser()?.name || 'Système';
  }

  // Added missing recordCashFlow method
  recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) {
    if (!this.currentCompanyId) return;
    const currentCash = this.getCashFlow();
    const newFlow: CashFlow = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type,
      category,
      description,
      amount,
      author: this.getUser()
    };
    localStorage.setItem(`nexapme_${this.currentCompanyId}_cash`, JSON.stringify([newFlow, ...currentCash]));
  }

  getSales(): Sale[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_sales`);
    return cache ? JSON.parse(cache) : [];
  }

  addSale(sale: Sale) {
    if (!this.currentCompanyId) return;
    const sales = this.getSales();
    localStorage.setItem(`nexapme_${this.currentCompanyId}_sales`, JSON.stringify([sale, ...sales]));
    // Use recordCashFlow for consistency
    this.recordCashFlow(sale.total, 'IN', 'Vente', `Facture ${sale.id}`);
  }

  getCredits(): Credit[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_credits`);
    return cache ? JSON.parse(cache) : [];
  }

  repayCredit(id: string, amount: number) {
    const credits = this.getCredits();
    const updated = credits.map(c => {
        if (c.id === id) {
            const rem = Math.max(0, c.remainingAmount - amount);
            return { ...c, remainingAmount: rem, status: rem === 0 ? 'PAID' : 'PENDING' } as Credit;
        }
        return c;
    });
    localStorage.setItem(`nexapme_${this.currentCompanyId}_credits`, JSON.stringify(updated));
  }

  getCashFlow(): CashFlow[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_cash`);
    return cache ? JSON.parse(cache) : [];
  }

  getCashBalance(): number {
    const flows = this.getCashFlow();
    return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0);
  }

  getInventories(): InventoryReport[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_inventory`);
    return cache ? JSON.parse(cache) : [];
  }

  addInventory(report: InventoryReport) {
    const current = this.getInventories();
    localStorage.setItem(`nexapme_${this.currentCompanyId}_inventory`, JSON.stringify([report, ...current]));
  }

  getWeeklySalesData() {
    return [];
  }

  getUsers(): UserProfile[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_users`);
    return cache ? JSON.parse(cache) : [];
  }

  saveUsers(users: UserProfile[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_users`, JSON.stringify(users));
  }

  getSubCategories(): SubCategory[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_subcategories`);
    return cache ? JSON.parse(cache) : [];
  }

  saveSubCategories(sub: SubCategory[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_subcategories`, JSON.stringify(sub));
  }

  getOperations(): Operation[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_operations`);
    return cache ? JSON.parse(cache) : [];
  }

  saveOperations(ops: Operation[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_operations`, JSON.stringify(ops));
  }

  getAppointments(): Appointment[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_appointments`);
    return cache ? JSON.parse(cache) : [];
  }

  saveAppointments(apps: Appointment[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_appointments`, JSON.stringify(apps));
  }

  getQuotes(): Quote[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_quotes`);
    return cache ? JSON.parse(cache) : [];
  }

  saveQuotes(quotes: Quote[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_quotes`, JSON.stringify(quotes));
  }

  resetAll() {
    localStorage.clear();
    window.location.reload();
  }

  exportAllDataAsJSON() {
    const data = { ...localStorage };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup.json';
    a.click();
  }

  importDataFromJSON(text: string) {
    const data = JSON.parse(text);
    Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
    window.location.reload();
  }
}

export const storageService = new StorageService();
