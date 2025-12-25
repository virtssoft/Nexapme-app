
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export class ApiService {
  static async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      // On utilise un simple GET sans en-tête complexe pour tester la connexion
      await fetch(`${API_BASE_URL}/auth/validate-license.php`, { 
        method: 'OPTIONS',
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true; 
    } catch (e) {
      return false;
    }
  }

  private static async request<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', data: any = {}): Promise<T> {
    const token = localStorage.getItem('nexapme_jwt');
    const licenseKey = localStorage.getItem('nexapme_active_license_key');
    
    // On simplifie les headers au maximum pour éviter les pré-flight CORS complexes
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `${API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers
    };

    if (method === 'POST') {
      const payload = { ...data };
      if (licenseKey && !payload.license_key) payload.license_key = licenseKey;
      options.body = JSON.stringify(payload);
    } else {
      const urlObj = new URL(url);
      Object.keys(data).forEach(key => urlObj.searchParams.append(key, String(data[key])));
      url = urlObj.toString();
    }
    
    try {
      const response = await fetch(url, options);
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || json.message || `Erreur serveur (${response.status})`);
      }

      return json;
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        throw new Error("Erreur CORS ou Hors-ligne : Le serveur Nexa ne répond pas. Vérifiez la configuration CORS sur votre serveur PHP.");
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
