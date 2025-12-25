
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiService {
  /**
   * Vérifie la connectivité globale
   */
  static async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}/`, { 
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true; 
    } catch (e) {
      return false;
    }
  }

  private static async request<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<T> {
    const token = localStorage.getItem('nexapme_jwt');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL(`${API_BASE_URL}${endpoint}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal
      };

      if (method === 'POST' && data) {
        options.body = JSON.stringify(data);
      } else if (method === 'GET' && data) {
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            url.searchParams.append(key, String(data[key]));
          }
        });
      }

      const response = await fetch(url.toString(), options);
      clearTimeout(timeoutId);
      
      if (response.status === 401) {
        localStorage.removeItem('nexapme_jwt');
        throw new Error("Session expirée.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur serveur (${response.status})`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') throw new Error("Délai d'attente dépassé (Timeout).");
      throw error;
    }
  }

  // --- AUTH ---
  static validateLicense(key: string) { return this.request<any>('/auth/validate-license.php', 'POST', { license_key: key }); }
  static login(pme_id: string, user_id: string, pin: string) { return this.request<any>('/auth/login.php', 'POST', { pme_id, user_id, pin }); }

  // --- STOCK ---
  static getStock(pme_id: string) { return this.request<any[]>('/stock/index.php', 'GET', { pme_id }); }
  static saveProduct(product: any) { return this.request<any>('/stock/save.php', 'POST', product); }

  // --- SALES ---
  static createSale(saleData: any) { return this.request<any>('/sales/create.php', 'POST', saleData); }
  static getSales(pme_id: string, params?: any) { return this.request<any[]>('/sales/history.php', 'GET', { pme_id, ...params }); }

  // --- FINANCE ---
  static getCashFlow(pme_id: string) { return this.request<any[]>('/finance/cash.php', 'GET', { pme_id }); }
  static recordCash(data: any) { return this.request<any>('/finance/cash-record.php', 'POST', data); }
  static getCredits(pme_id: string) { return this.request<any[]>('/finance/credits.php', 'GET', { pme_id }); }
  static repayCredit(data: any) { return this.request<any>('/finance/credit-repay.php', 'POST', data); }

  // --- INVENTORY ---
  static getInventories(pme_id: string) { return this.request<any[]>('/inventory/get-history.php', 'GET', { pme_id }); }
  static saveInventory(report: any) { return this.request<any>('/inventory/save-report.php', 'POST', report); }

  // --- USERS MANAGEMENT ---
  static getUsers(pme_id: string) { return this.request<any[]>('/users/get-users.php', 'GET', { pme_id }); }
  static saveUser(userData: any) { return this.request<any>('/users/save-user.php', 'POST', userData); }
  static deleteUser(pme_id: string, user_id: string) { return this.request<any>('/users/delete-user.php', 'POST', { pme_id, user_id }); }

  // --- ADMIN ROOT SPACE ---
  static getPmes() { return this.request<any[]>('/admin/get-pmes.php', 'GET'); }
  static savePme(pmeData: any) { return this.request<any>('/admin/save-pme.php', 'POST', pmeData); }
  static deletePme(id: string) { return this.request<any>('/admin/delete-pme.php', 'POST', { id }); }
}
