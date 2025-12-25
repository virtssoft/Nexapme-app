
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';
const SERVER_ROOT = 'https://nexaapi.comfortasbl.org';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiService {
  /**
   * Vérifie si le serveur est joignable.
   * Cible spécifiquement https://nexaapi.comfortasbl.org/api/
   */
  static async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // On teste la racine du dossier API
      // Note: L'ajout du '/' final est important pour certains serveurs
      const response = await fetch(`${API_BASE_URL}/`, { 
        method: 'GET',
        mode: 'no-cors', // Crucial pour tester la connectivité sans blocage CORS direct
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      // Si la promesse est résolue, c'est que le serveur a répondu physiquement
      return true; 
    } catch (e) {
      console.warn("[API CHECK] Échec de la connexion à /api/");
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
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
      if (error.name === 'AbortError') {
        throw new Error("Le serveur met trop de temps à répondre (Timeout).");
      }
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        console.error(`[NETWORK ERROR] ${endpoint}: Problème de connexion ou CORS.`);
        throw new Error("Accès refusé par le navigateur ou serveur injoignable. Vérifiez les réglages CORS sur votre API.");
      }
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
