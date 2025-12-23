
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiService {
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
      const options: RequestInit = {
        method,
        headers,
        // Ajout d'un timeout pour éviter les attentes infinies en cas de réseau instable
        signal: AbortSignal.timeout(10000) 
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
      
      if (response.status === 401) {
        localStorage.removeItem('nexapme_jwt');
        // Ne pas recharger brutalement si on est déjà sur la page de login
        if (!window.location.hash.includes('login')) {
           window.location.reload();
        }
        throw new Error("Session expirée.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur serveur (${response.status})`);
      }

      return await response.json();
    } catch (error: any) {
      // Gestion spécifique des erreurs de connexion (Failed to fetch)
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        console.error(`[NETWORK ERROR] ${endpoint}: Impossible de joindre le serveur.`);
        throw new Error("Erreur de connexion : Le serveur nexaPME est injoignable.");
      }
      console.error(`[API ERROR] ${endpoint}:`, error.message);
      throw error;
    }
  }

  // Auth
  static validateLicense(key: string) { return this.request<any>('/auth/validate-license.php', 'POST', { license_key: key }); }
  static login(pme_id: string, user_id: string, pin: string) { return this.request<any>('/auth/login.php', 'POST', { pme_id, user_id, pin }); }

  // Stock
  static getStock(pme_id: string) { return this.request<any[]>('/stock/index.php', 'GET', { pme_id }); }
  static saveProduct(product: any) { return this.request<any>('/stock/save.php', 'POST', product); }

  // Sales
  static createSale(saleData: any) { return this.request<any>('/sales/create.php', 'POST', saleData); }
  static getSales(pme_id: string, params?: any) { return this.request<any[]>('/sales/history.php', 'GET', { pme_id, ...params }); }

  // Finance
  static getCashFlow(pme_id: string) { return this.request<any[]>('/finance/cash.php', 'GET', { pme_id }); }
  static recordCash(data: any) { return this.request<any>('/finance/cash-record.php', 'POST', data); }
  static getCredits(pme_id: string) { return this.request<any[]>('/finance/credits.php', 'GET', { pme_id }); }
  static repayCredit(data: any) { return this.request<any>('/finance/credit-repay.php', 'POST', data); }
}
