
const API_BASE_URL = 'https://nexaapi.comfortasbl.org/api';

export class ApiService {
  private static async request(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    const token = localStorage.getItem('nexapme_jwt');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const url = new URL(`${API_BASE_URL}${endpoint}`);
      const options: RequestInit = {
        method,
        headers,
      };

      if (data && method === 'POST') {
        options.body = JSON.stringify(data);
      } else if (data && method === 'GET') {
        Object.keys(data).forEach(key => url.searchParams.append(key, data[key]));
      }

      const response = await fetch(url.toString(), options);
      const json = await response.json();

      if (json.error) {
        throw new Error(json.error);
      }

      return json;
    } catch (error: any) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // --- Auth ---
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

  // --- Sales ---
  static async createSale(saleData: any) {
    return this.request('/sales/create.php', 'POST', saleData);
  }

  static async getSalesHistory(pme_id: string) {
    return this.request('/sales/history.php', 'GET', { pme_id });
  }

  // --- Dashboard ---
  static async getDashboardStats(pme_id: string) {
    return this.request('/dashboard/stats.php', 'GET', { pme_id });
  }
}
