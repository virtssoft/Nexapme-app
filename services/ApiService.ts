
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export class ApiService {
  /**
   * Vérifie la connectivité globale
   */
  static async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      // On retire no-cors pour avoir un vrai statut si possible
      const response = await fetch(`${API_BASE_URL}/`, { 
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok || response.status === 404; // 404 est acceptable car la racine peut ne pas exister
    } catch (e) {
      return false;
    }
  }

  private static async request<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', data: any = {}): Promise<T> {
    const token = localStorage.getItem('nexapme_jwt');
    const licenseKey = localStorage.getItem('nexapme_active_license_key');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // On prépare l'objet de données en incluant la clé de licence si disponible
    // On l'envoie dans le body (POST) ou les params (GET) au lieu d'un header custom
    // pour éviter les blocages CORS (preflight OPTIONS)
    const requestData = { ...data };
    if (licenseKey && !requestData.license_key) {
      requestData.license_key = licenseKey;
    }

    let url = `${API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers
    };

    if (method === 'POST') {
      options.body = JSON.stringify(requestData);
    } else {
      const urlObj = new URL(url);
      Object.keys(requestData).forEach(key => {
        if (requestData[key] !== undefined && requestData[key] !== null) {
          urlObj.searchParams.append(key, String(requestData[key]));
        }
      });
      url = urlObj.toString();
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      options.signal = controller.signal;

      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      const json = await response.json().catch(() => ({}));

      if (json.error) {
        if (response.status === 401 || json.error.toLowerCase().includes('expire')) {
          localStorage.removeItem('nexapme_jwt');
        }
        throw new Error(json.error);
      }

      if (!response.ok) {
        throw new Error(json.message || `Erreur serveur (${response.status})`);
      }

      return json;
    } catch (error: any) {
      if (error.name === 'AbortError') throw new Error("Le serveur ne répond pas (Timeout).");
      if (error.message === 'Failed to fetch') throw new Error("Impossible de contacter le serveur (CORS ou Réseau).");
      throw error;
    }
  }

  // 1. Authentification & Licence
  static validateLicense(key: string) { 
    return this.request<any>('/auth/validate-license.php', 'POST', { license_key: key }); 
  }
  static login(pme_id: string, user_id: string, pin: string) { 
    return this.request<any>('/auth/login.php', 'POST', { pme_id, user_id, pin }); 
  }

  // 2. Stock
  static getStock(pme_id: string) { 
    return this.request<any[]>('/stock/index.php', 'GET', { pme_id }); 
  }
  static saveProduct(data: any) { 
    return this.request<any>('/stock/create.php', 'POST', data); 
  }

  // 3. Ventes
  static createSale(saleData: any) { 
    return this.request<any>('/sales/create.php', 'POST', saleData); 
  }
  static getSales(pme_id: string) { 
    return this.request<any[]>('/sales/history.php', 'GET', { pme_id }); 
  }

  // 4. Administration PME (ROOT)
  static getAdminPmes() {
    return this.request<any[]>('/admin/pme/index.php', 'GET');
  }
  static createAdminPme(data: any) {
    return this.request<any>('/admin/pme/create.php', 'POST', data);
  }
  static updateAdminPme(data: any) {
    return this.request<any>('/admin/pme/update.php', 'POST', data);
  }
  static deleteAdminPme(id: string) {
    return this.request<any>('/admin/pme/delete.php', 'POST', { id });
  }

  // 5. Gestion Utilisateurs (Manager)
  static getUsers(pme_id: string) {
    return this.request<any[]>('/users/index.php', 'GET', { pme_id });
  }
  static createUser(data: any) {
    return this.request<any>('/users/create.php', 'POST', data);
  }
  static updateUser(data: any) {
    return this.request<any>('/users/update.php', 'POST', data);
  }
  static deleteUser(id: string) {
    return this.request<any>('/users/delete.php', 'POST', { id });
  }
}
