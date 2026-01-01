
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export class ApiService {
  /**
   * Vérifie si le serveur Nexa est physiquement joignable.
   * On tente d'abord une lecture propre (CORS), sinon un ping aveugle (no-cors).
   */
  static async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        // Tentative 1: Lecture JSON (Idéal)
        const response = await fetch(`${API_BASE_URL}/index.php`, { 
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'online' || data.service) {
            clearTimeout(timeoutId);
            return true;
          }
        }
      } catch (e) {
        // Échec CORS ou JSON, on tente le fallback no-cors
      }

      // Tentative 2: Ping aveugle (no-cors)
      await fetch(`${API_BASE_URL}/index.php`, { 
        method: 'GET',
        mode: 'no-cors', 
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true; 
    } catch (e: any) {
      console.warn("Nexa Cloud Check failed:", e.message);
      return false;
    }
  }

  private static async request<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', data: any = {}): Promise<T> {
    const token = localStorage.getItem('nexapme_jwt');
    const licenseKey = localStorage.getItem('nexapme_active_license_key');
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;
    
    const options: RequestInit = {
      method,
      headers,
      mode: 'cors'
    };

    if (method === 'POST') {
      const payload = { ...data };
      if (licenseKey && !payload.license_key) payload.license_key = licenseKey;
      options.body = JSON.stringify(payload);
    } else {
      const urlObj = new URL(url);
      Object.keys(data).forEach(key => urlObj.searchParams.append(key, String(data[key])));
      return this.executeFetch<T>(urlObj.toString(), options);
    }
    
    return this.executeFetch<T>(url, options);
  }

  private static async executeFetch<T>(url: string, options: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error("Réponse serveur non-JSON. Vérifiez votre configuration serveur.");
      }

      if (!response.ok) {
        throw new Error(json.error || json.message || `Erreur ${response.status}`);
      }

      return json;
    } catch (error: any) {
      if (error.message === 'Failed to fetch' || error.message.includes('network error')) {
        throw new Error("Liaison Cloud impossible : Erreur réseau ou blocage CORS.");
      }
      throw error;
    }
  }

  static validateLicense(key: string) { return this.request<any>('/auth/validate-license.php', 'POST', { license_key: key }); }
  static login(pme_id: string, user_id: string, pin: string) { return this.request<any>('/auth/login.php', 'POST', { pme_id, user_id, pin }); }
  static getStock(pme_id: string) { return this.request<any[]>('/stock/index.php', 'GET', { pme_id }); }
  static saveProduct(data: any) { return this.request<any>('/stock/create.php', 'POST', data); }
  static createSale(saleData: any) { return this.request<any>('/sales/create.php', 'POST', saleData); }
  static getSales(pme_id: string) { return this.request<any[]>('/sales/history.php', 'GET', { pme_id }); }
  static getAdminPmes() { return this.request<any[]>('/admin/pme/index.php', 'GET'); }
  static createAdminPme(data: any) { return this.request<any>('/admin/pme/create.php', 'POST', data); }
  static updateAdminPme(data: any) { return this.request<any>('/admin/pme/update.php', 'POST', data); }
  static deleteAdminPme(id: string) { return this.request<any>('/admin/pme/delete.php', 'POST', { id }); }
  static getUsers(pme_id: string) { return this.request<any[]>('/users/index.php', 'GET', { pme_id }); }
  static createUser(data: any) { return this.request<any>('/users/create.php', 'POST', data); }
}
