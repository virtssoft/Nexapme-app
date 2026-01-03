
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export class ApiService {
  /**
   * Vérifie si le serveur Nexa est physiquement joignable.
   */
  static async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch(`${API_BASE_URL}/index.php`, { 
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        if (response.ok) {
          clearTimeout(timeoutId);
          return true;
        }
      } catch (e) {}

      await fetch(`${API_BASE_URL}/index.php`, { 
        method: 'GET',
        mode: 'no-cors', 
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true; 
    } catch (e: any) {
      return false;
    }
  }

  private static async request<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data: any = {}): Promise<T> {
    const token = localStorage.getItem('nexapme_jwt');
    const licenseKey = localStorage.getItem('nexapme_active_license_key');
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${API_BASE_URL}${cleanEndpoint}`;
    
    const options: RequestInit = {
      method,
      headers,
      mode: 'cors'
    };

    const urlObj = new URL(url);
    if (data.pme_id) urlObj.searchParams.append('pme_id', data.pme_id);
    if (data.type) urlObj.searchParams.append('type', data.type);
    if (data.from) urlObj.searchParams.append('from', data.from);
    if (data.to) urlObj.searchParams.append('to', data.to);
    
    if (data.id && (method === 'PUT' || method === 'DELETE' || method === 'GET')) {
      urlObj.searchParams.append('id', data.id);
    }

    if (method === 'POST' || method === 'PUT') {
      const payload = { ...data };
      if (method === 'PUT') {
        delete payload.id;
        delete payload.pme_id;
      }
      if (licenseKey && !payload.license_key) payload.license_key = licenseKey;
      options.body = JSON.stringify(payload);
    }

    return this.executeFetch<T>(urlObj.toString(), options);
  }

  private static async executeFetch<T>(url: string, options: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error("Réponse serveur corrompue.");
      }

      if (!response.ok) {
        throw new Error(json.error || json.message || `Erreur ${response.status}`);
      }

      if (json.status === 'ok' && json.data !== undefined) return json.data as T;
      return json;
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        throw new Error("Serveur Cloud Nexa injoignable.");
      }
      throw error;
    }
  }

  // --- Auth ---
  static validateLicense(key: string) { return this.request<any>('/auth/validate-license.php', 'POST', { license_key: key }); }
  static login(name: string, pin: string) { return this.request<any>('/users/login.php', 'POST', { name, pin }); }

  // --- Stock & Inventory ---
  static getStock(pme_id: string) { return this.request<any[]>('/stock/index.php', 'GET', { pme_id }); }
  static getInventory(pme_id: string, type?: 'wholesale' | 'retail') { return this.request<any[]>('/stock/inventory.php', 'GET', { pme_id, type }); }
  static createProduct(data: any) { return this.request<any>('/stock/index.php', 'POST', data); }
  static updateProduct(id: string, pme_id: string, data: any) { return this.request<any>('/stock/index.php', 'PUT', { id, pme_id, ...data }); }
  static deleteProduct(id: string, pme_id: string) { return this.request<any>('/stock/index.php', 'DELETE', { id, pme_id }); }
  
  // --- Transformation ---
  static transformStock(pme_id: string, from_id: string, to_id: string, quantity: number, factor: number) { 
    return this.request<any>('/stock/transform.php', 'POST', { 
      pme_id, 
      from_id, 
      to_id, 
      quantity_to_transform: quantity, 
      conversion_factor: factor 
    }); 
  }

  // --- Sales ---
  static createSale(saleData: any) { return this.request<any>('/sales/create.php', 'POST', saleData); }
  static getSales(pme_id: string, from?: string, to?: string) { return this.request<any[]>('/sales/history.php', 'GET', { pme_id, from, to }); }
  
  // --- Dashboard & Config ---
  static getDashboardStats(pme_id: string) { return this.request<any>('/dashboard/stats.php', 'GET', { pme_id }); }
  static getDashboardConfig(pme_id: string) { return this.request<any>('/dashboard/config.php', 'GET', { pme_id }); }
  static saveDashboardConfig(pme_id: string, configData: any) { return this.request<any>('/dashboard/config.php', 'POST', { pme_id, ...configData }); }

  // --- Admin & Users ---
  static getAdminPmes() { return this.request<any[]>('/admin/pme/index.php', 'GET'); }
  static createAdminPme(data: any) { return this.request<any>('/admin/pme/create.php', 'POST', data); }
  static updateAdminPme(data: any) { return this.request<any>('/admin/pme/update.php', 'POST', data); }
  static deleteAdminPme(id: string) { return this.request<any>('/admin/pme/delete.php', 'POST', { id }); }
  static getUsers(pme_id: string) { return this.request<any[]>('/users/index.php', 'GET', { pme_id }); }
  static createUser(data: any) { return this.request<any>('/users/create.php', 'POST', data); }
  static updateUser(data: any) { return this.request<any>('/users/update.php', 'POST', data); }
  static toggleUserStatus(id: string, status: 'ACTIVE' | 'DISABLED') { return this.request<any>('/users/toggle-status.php', 'POST', { id, status }); }
  static deleteUser(id: string) { return this.request<any>('/users/delete.php', 'POST', { id }); }
}
