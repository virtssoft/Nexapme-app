
import { STORAGE_KEYS, INITIAL_STOCK } from '../constants';
import { StockItem, Sale, Credit, CashFlow, InventoryReport, CompanyConfig, UserProfile, PMEEntry, LicenseInfo, View, SubCategory, Operation, Appointment, Quote } from '../types';
import { ApiService } from './ApiService';

class StorageService {
  private currentCompanyId: string | null = null;

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
    // 1. GESTION LOCALE DES CLÉS SPÉCIALES (Bypass API pour test)
    if (key === 'TRIAL_MODE') {
      return { key, type: 'TRIAL', pmeName: 'ENTREPRISE D\'ESSAI', idUnique: 'TRIAL_PME' };
    }
    if (key === 'nexaPME2025') {
      return { key, type: 'ADMIN', pmeName: 'ADMINISTRATION', idUnique: 'ADMIN' };
    }
    if (key === 'nexaUNN2025') {
      return { key, type: 'UNIVERSAL', pmeName: 'MASTER PME', idUnique: 'MASTER_PME' };
    }

    // 2. APPEL API POUR LES AUTRES CLÉS
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
      console.error("Erreur de validation via API:", e);
      return null;
    }
  }

  async loginRemote(pme_id: string, user_id: string, pin: string): Promise<{user: UserProfile, token: string} | null> {
    // Bypass pour TRIAL_PME
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

  // --- Gestion du Stock (Source: DB via API) ---
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

  async splitStockItem(sourceId: string, targetId: string, qty: number) {
    if (this.currentCompanyId === 'TRIAL_PME') return { success: true };
    return await ApiService.transformStock(sourceId, targetId, qty);
  }

  // --- Gestion des Ventes ---
  getSales(): Sale[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_sales`);
    return cache ? JSON.parse(cache) : [];
  }

  async fetchSalesHistory(): Promise<Sale[]> {
    if (!this.currentCompanyId || this.currentCompanyId === 'TRIAL_PME') return this.getSales();
    try {
      const remote = await ApiService.getSalesHistory(this.currentCompanyId);
      const formatted = remote.map((s: any) => ({
        id: s.id,
        date: s.sale_date,
        total: parseFloat(s.total),
        paymentType: s.payment_type,
        customerName: s.customer_name,
        author: s.author_name || 'Utilisateur',
        items: s.items ? s.items.map((i: any) => ({
          itemId: i.item_id,
          designation: i.designation,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unit_price),
          total: parseFloat(i.total)
        })) : []
      }));
      localStorage.setItem(`nexapme_${this.currentCompanyId}_sales`, JSON.stringify(formatted));
      return formatted;
    } catch (e) {
      return this.getSales();
    }
  }

  async addSale(sale: Sale) {
    if (!this.currentCompanyId) return;
    
    // Ajout local immédiat
    const sales = this.getSales();
    localStorage.setItem(`nexapme_${this.currentCompanyId}_sales`, JSON.stringify([sale, ...sales]));

    if (this.currentCompanyId !== 'TRIAL_PME') {
        const payload = {
            id: sale.id,
            pme_id: this.currentCompanyId,
            user_id: sale.authorId,
            payment_type: sale.paymentType,
            customer_name: sale.customerName,
            items: sale.items.map(i => ({ item_id: i.itemId, quantity: i.quantity }))
        };
        await ApiService.createSale(payload).catch(err => console.error("Échec envoi vente API:", err));
    }
    
    // Gérer les crédits & caisse
    if (sale.paymentType === 'CREDIT' || sale.paymentType === 'MIXED') {
      const creditAmount = sale.paymentType === 'MIXED' ? (sale.creditAmount || 0) : sale.total;
      if (creditAmount > 0) {
        const credits = this.getCredits();
        const newCredit: Credit = {
          id: sale.id,
          customerName: sale.customerName || 'Client Inconnu',
          date: sale.date,
          initialAmount: creditAmount,
          remainingAmount: creditAmount,
          status: 'PENDING',
          history: []
        };
        localStorage.setItem(`nexapme_${this.currentCompanyId}_credits`, JSON.stringify([newCredit, ...credits]));
      }
    }

    const cashAmount = sale.paymentType === 'MIXED' ? (sale.cashAmount || 0) : (sale.paymentType === 'CASH' || sale.paymentType === 'MOBILE_MONEY' ? sale.total : 0);
    if (cashAmount > 0) {
      this.recordCashFlow(cashAmount, 'IN', 'Vente', `Facture ${sale.id}`);
    }
  }

  // --- Gestion des Crédits ---
  getCredits(): Credit[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_credits`);
    return cache ? JSON.parse(cache) : [];
  }

  repayCredit(id: string, amount: number) {
    const credits = this.getCredits();
    const updated = credits.map(c => {
      if (c.id === id) {
        const newRemaining = Math.max(0, c.remainingAmount - amount);
        const history = [...(c.history || []), { 
          date: new Date().toISOString(), 
          amount, 
          note: 'Remboursement partiel', 
          authorId: this.getCurrentUser()?.id || 'system' 
        }];
        return { 
          ...c, 
          remainingAmount: newRemaining, 
          status: (newRemaining === 0 ? 'PAID' : 'PENDING') as 'PAID' | 'PENDING',
          history 
        };
      }
      return c;
    });
    localStorage.setItem(`nexapme_${this.currentCompanyId}_credits`, JSON.stringify(updated));
    this.recordCashFlow(amount, 'IN', 'Remboursement Crédit', `Paiement client sur crédit ${id}`);
  }

  // --- Journal de Caisse ---
  getCashFlow(): CashFlow[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_cash`);
    return cache ? JSON.parse(cache) : [];
  }

  getCashBalance(): number {
    const flows = this.getCashFlow();
    return flows.reduce((acc, f) => f.type === 'IN' ? acc + f.amount : acc - f.amount, 0);
  }

  recordCashFlow(amount: number, type: 'IN' | 'OUT', category: string, description: string) {
    const flows = this.getCashFlow();
    const newFlow: CashFlow = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type,
      category,
      description,
      amount,
      author: this.getUser()
    };
    localStorage.setItem(`nexapme_${this.currentCompanyId}_cash`, JSON.stringify([newFlow, ...flows]));
  }

  // --- Inventaires ---
  getInventories(): InventoryReport[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_inventory`);
    return cache ? JSON.parse(cache) : [];
  }

  addInventory(report: InventoryReport) {
    const reports = this.getInventories();
    localStorage.setItem(`nexapme_${this.currentCompanyId}_inventory`, JSON.stringify([report, ...reports]));
  }

  // --- Opérations & Planning ---
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

  // --- Devis & Facturation ---
  getQuotes(): Quote[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_quotes`);
    return cache ? JSON.parse(cache) : [];
  }

  saveQuotes(quotes: Quote[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_quotes`, JSON.stringify(quotes));
  }

  // --- Gestion des Utilisateurs ---
  getUsers(): UserProfile[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_users`);
    return cache ? JSON.parse(cache) : [];
  }

  saveUsers(users: UserProfile[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_users`, JSON.stringify(users));
  }

  // --- Sous-Catégories ---
  getSubCategories(): SubCategory[] {
    if (!this.currentCompanyId) return [];
    const cache = localStorage.getItem(`nexapme_${this.currentCompanyId}_subcategories`);
    return cache ? JSON.parse(cache) : [];
  }

  saveSubCategories(subs: SubCategory[]) {
    if (!this.currentCompanyId) return;
    localStorage.setItem(`nexapme_${this.currentCompanyId}_subcategories`, JSON.stringify(subs));
  }

  // --- Statistiques Dashboard ---
  getWeeklySalesData() {
    const sales = this.getSales();
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const stats: Record<string, number> = {};
    
    sales.forEach(s => {
      const d = new Date(s.date);
      const dayName = days[(d.getDay() + 6) % 7];
      stats[dayName] = (stats[dayName] || 0) + s.total;
    });

    return days.map(d => ({ name: d, amount: stats[d] || 0 }));
  }

  async getDashboardStats() {
    if (!this.currentCompanyId || this.currentCompanyId === 'TRIAL_PME') return null;
    return await ApiService.getDashboardStats(this.currentCompanyId);
  }

  // --- Espace Admin ---
  async getPmeListRemote(): Promise<PMEEntry[]> {
    try {
      return await ApiService.getPmeList();
    } catch (e) {
      return [];
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

  resetAll() {
    localStorage.clear();
    window.location.reload();
  }

  /**
   * Export all data related to the current company as a JSON file.
   * Logic: Collects all keys from localStorage that belong to the active company ID.
   */
  exportAllDataAsJSON() {
    if (!this.currentCompanyId) return;
    const data: Record<string, any> = {};
    const prefix = `nexapme_${this.currentCompanyId}_`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch (e) {
            data[key] = value;
          }
        }
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexapme_backup_${this.currentCompanyId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from a JSON string into localStorage.
   * Logic: Parses the JSON and iterates over keys to update localStorage.
   */
  importDataFromJSON(jsonText: string) {
    try {
      const data = JSON.parse(jsonText);
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
      alert("Importation réussie ! L'application va redémarrer.");
      window.location.reload();
    } catch (e) {
      console.error("Import error:", e);
      alert("Erreur lors de l'importation : Format JSON invalide.");
    }
  }
}

export const storageService = new StorageService();
