
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export class ApiService {
  /**
   * Vérifie la connectivité au Cloud Nexa.
   */
  static async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(`${API_BASE_URL}/index.php`, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal
      }).catch(() => null);
      
      clearTimeout(timeoutId);
      if (response) return true;

      const secondTry = await fetch(`${API_BASE_URL}/users/login.php`, { method: 'OPTIONS', mode: 'cors' }).catch(() => null);
      return !!secondTry;
      
    } catch (e: any) {
      return false;
    }
  }

  static async request<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data: any = {}): Promise<T> {
    const token = localStorage.getItem('nexapme_jwt');
    const licenseKey = localStorage.getItem('nexapme_active_license_key');
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${API_BASE_URL}${cleanEndpoint}`;
    
    const urlObj = new URL(url);

    if (data.pme_id) {
      urlObj.searchParams.set('pme_id', data.pme_id);
    }
    
    if (data.id && (method === 'PUT' || method === 'DELETE' || (method === 'POST' && endpoint.includes('update')))) {
      urlObj.searchParams.set('id', data.id);
    }

    if (method === 'GET' || method === 'DELETE') {
      Object.keys(data).forEach(key => {
        if (key !== 'pme_id' && key !== 'id' && data[key] !== undefined) {
          urlObj.searchParams.append(key, data[key]);
        }
      });
    }

    const options: RequestInit = { 
      method, 
      headers, 
      mode: 'cors' 
    };

    if (method === 'POST' || method === 'PUT') {
      const payload = { ...data };
      if (licenseKey && !payload.license_key) payload.license_key = licenseKey;
      options.body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(urlObj.toString(), options);
      
      if (response.status === 404) {
        throw new Error(`ERREUR_404: Fichier ${cleanEndpoint} introuvable.`);
      }

      const text = await response.text();
      let json;
      try {
        // Extraction robuste du JSON : on cherche le premier '{' ou '[' et le dernier '}' ou ']'
        // Cela permet d'ignorer les <br /><b>Warning</b>... envoyés par PHP avant le JSON
        const startIdx = Math.min(
          text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
          text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
        );
        const endIdx = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));

        if (startIdx !== Infinity && endIdx !== -1 && endIdx > startIdx) {
          json = JSON.parse(text.substring(startIdx, endIdx + 1));
        } else {
          json = JSON.parse(text);
        }
      } catch (e) {
        console.error("Réponse brute corrompue ou non-JSON:", text);
        throw new Error("ERREUR_FORMAT: Le serveur a renvoyé des données invalides.");
      }

      if (!response.ok) {
        throw new Error(json.error || json.message || `Erreur ${response.status}`);
      }

      return (json.status === 'ok' && json.data !== undefined) ? json.data : json;
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        throw new Error("ERREUR_CLOUD");
      }
      throw error;
    }
  }

  // --- Auth ---
  static validateLicense(key: string) { return this.request<any>('/auth/validate-license.php', 'POST', { license_key: key }); }
  static login(name: string, pin: string) { return this.request<any>('/users/login.php', 'POST', { name, pin }); }

  // --- Stock ---
  static getStock(pme_id: string) { return this.request<any[]>('/stock/index.php', 'GET', { pme_id }); }
  static getInventory(pme_id: string, type?: 'wholesale' | 'retail') { return this.request<any[]>('/stock/inventory.php', 'GET', { pme_id, type }); }
  static createProduct(data: any) { return this.request<any>('/stock/index.php', 'POST', data); }
  static updateProduct(id: string, pme_id: string, data: any) { 
    return this.request<any>('/stock/index.php', 'PUT', { ...data, id, pme_id }); 
  }
  static deleteProduct(id: string, pme_id: string) { 
    return this.request<any>('/stock/index.php', 'DELETE', { id, pme_id }); 
  }
  static transformStock(pme_id: string, from_id: string, to_id: string, quantity: number, factor: number) { 
    return this.request<any>('/stock/transform.php', 'POST', { pme_id, from_id, to_id, quantity_to_transform: quantity, conversion_factor: factor }); 
  }

  // --- Sales ---
  static createSale(saleData: any) { return this.request<any>('/sales/create.php', 'POST', saleData); }
  static getSales(pme_id: string, from?: string, to?: string) { return this.request<any[]>('/sales/history.php', 'GET', { pme_id, from, to }); }
  
  // --- Cash & Credits ---
  static getCashLedger(pme_id: string) { return this.request<any[]>('/cash/ledger.php', 'GET', { pme_id }); }
  static recordExpense(data: any) { return this.request<any>('/cash/expense.php', 'POST', data); }
  static getCredits(pme_id: string) { return this.request<any[]>('/credits/list.php', 'GET', { pme_id }); }
  static repayCredit(data: any) { return this.request<any>('/credits/repay.php', 'POST', data); }
  
  // --- Dashboard ---
  static getDashboardStats(pme_id: string) { return this.request<any>('/dashboard/stats.php', 'GET', { pme_id }); }
  static getDashboardConfig(pme_id: string) { return this.request<any>('/dashboard/config.php', 'GET', { pme_id }); }
  static saveDashboardConfig(pme_id: string, configData: any) { return this.request<any>('/dashboard/config.php', 'POST', { pme_id, ...configData }); }

  // --- Admin ---
  static getAdminPmes() { return this.request<any[]>('/admin/pme/index.php', 'GET'); }
  static createAdminPme(data: any) { return this.request<any>('/admin/pme/index.php', 'POST', data); }
  static updateAdminPme(data: any) { return this.request<any>('/admin/pme/index.php', 'PUT', data); }
  static deleteAdminPme(id: string) { return this.request<any>('/admin/pme/index.php', 'DELETE', { id }); }
  static getUsers(pme_id: string) { return this.request<any[]>('/users/index.php', 'GET', { pme_id }); }
  static createUser(data: any) { return this.request<any>('/users/create.php', 'POST', data); }
  static updateUser(data: any) { return this.request<any>('/users/update.php', 'POST', data); }
  static deleteUser(id: string) { return this.request<any>('/users/delete.php', 'POST', { id }); }
  static toggleUserStatus(id: string, status: string) { return this.request<any>('/users/status.php', 'POST', { id, status }); }
}
