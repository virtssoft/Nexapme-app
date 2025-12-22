
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export class ApiService {
  private static async request(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    const token = localStorage.getItem('nexapme_jwt');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = new URL(`${API_BASE_URL}${endpoint}`);
    console.debug(`[API] ${method} ${url.toString()}`, data);

    try {
      const options: RequestInit = {
        method,
        headers,
      };

      if (data && method === 'POST') {
        options.body = JSON.stringify(data);
      } else if (data && method === 'GET') {
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            url.searchParams.append(key, data[key]);
          }
        });
      }

      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API ERROR] HTTP ${response.status}:`, errorText);
        throw new Error(`Erreur serveur HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }

      return json;
    } catch (error: any) {
      console.error(`[API FETCH FAILED] ${endpoint}:`, error.message);
      throw error;
    }
  }

  // --- Authentification ---
  static async validateLicense(licenseKey: string) {
    return this.request('/auth/validate-license.php', 'POST', { license_key: licenseKey });
  }

  static async login(pme_id: string, user_id: string, pin: string) {
    return this.request('/auth/login.php', 'POST', { pme_id, user_id, pin });
  }

  // --- Stock ---
  static async getStock(pme_id: string) {
    return this.request('/stock/index.php', 'GET', { pme_id });
  }

  static async createStock(data: any) {
    return this.request('/stock/create.php', 'POST', data);
  }

  static async transformStock(source_id: string, target_id: string, quantity: number) {
    return this.request('/stock/transform.php', 'POST', { source_id, target_id, quantity });
  }

  // --- Ventes ---
  static async createSale(saleData: any) {
    return this.request('/sales/create.php', 'POST', saleData);
  }

  static async getSalesHistory(pme_id: string) {
    return this.request('/sales/history.php', 'GET', { pme_id });
  }

  // --- Dashboard & Analytics ---
  static async getDashboardStats(pme_id: string) {
    return this.request('/dashboard/stats.php', 'GET', { pme_id });
  }

  // --- Espace Admin (Gestion des PME) ---
  static async getPmeList() {
    return this.request('/admin/pme-list.php', 'GET');
  }

  static async createPme(pmeData: any) {
    return this.request('/admin/pme-create.php', 'POST', pmeData);
  }

  static async updatePme(pmeId: string, pmeData: any) {
    return this.request('/admin/pme-update.php', 'POST', { id: pmeId, ...pmeData });
  }

  static async deletePme(pmeId: string) {
    return this.request('/admin/pme-delete.php', 'POST', { id: pmeId });
  }

  // --- Sauvegarde ---
  static async exportData(pme_id: string) {
    return this.request('/backup/export.php', 'GET', { pme_id });
  }
}
