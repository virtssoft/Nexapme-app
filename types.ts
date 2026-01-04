
// @ts-nocheck

export type UserRole = 'MANAGER' | 'WORKER' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  permissions?: View[];
}

export type LicenseType = 'NORMAL' | 'UNIVERSAL' | 'ADMIN' | 'TRIAL';

export interface LicenseInfo {
  key: string;
  type: LicenseType;
  expiryDate?: string; // ISO string
  pmeName: string;
  idUnique: string;
}

export interface PMEEntry {
  id: string;
  name: string;
  owner_name: string;
  license_key: string;
  license_type: LicenseType;
  expiry_date?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

export type ModuleDomain = 'FOOD_RETAIL' | 'TECH_SERVICES' | 'REAL_ESTATE' | 'MEDIA' | 'LOGISTICS' | 'FITNESS' | 'BEAUTY' | 'COMMERCE' | 'Retail' | 'Gros' | 'Alimentation';

export interface SubCategory {
  id: string;
  name: string;
  parentCategory: string;
}

export interface CompanyConfig {
  idUnique: string; // pme_id
  name: string;
  owner: string;
  currency: string; // "USD", "FC"
  exchange_rate: number;
  tax_id?: string; // RCCM
  phone?: string;
  address?: string;
  email?: string;
  domain?: ModuleDomain;
  setupDate?: string;
}

export interface StockItem {
  id: string;
  designation: string;
  quantity: number;
  unit: string;
  retailPrice: number;
  wholesalePrice: number;
  wholesaleThreshold?: number; 
  purchasePrice: number;
  alertThreshold: number;
  category: string;
  subCategory?: string;
  expiryDate?: string;
  isWholesale?: boolean;
}

export interface SaleItem {
  itemId: string;
  designation: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isWholesaleApplied?: boolean;
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentType: 'CASH' | 'CREDIT' | 'MOBILE_MONEY' | 'MIXED';
  cashAmount?: number;
  creditAmount?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  author: string;
  authorId: string;
  metadata?: any;
}

export interface Credit {
  id: string;
  customerName: string;
  date: string;
  remainingAmount: number;
  initialAmount: number;
  status: 'PENDING' | 'PAID';
  history: { 
    date: string; 
    amount: number; 
    note: string; 
    authorId: string;
  }[];
}

export interface CashFlow {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  category: string;
  description: string;
  amount: number;
  author: string;
  balance_after?: number;
}

export interface InventoryReport {
  id: string;
  date: string;
  type?: string;
  items: {
    itemId: string;
    designation: string;
    theoreticalQty: number;
    realQty: number;
    difference: number;
    lossValue: number;
  }[];
  totalLoss: number;
  author: string;
}

// Added missing Operation type
export interface Operation {
  id: string;
  clientName: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED';
  startDate: string;
  endDate?: string;
  estimatedCost: number;
  domain: ModuleDomain;
  metadata?: any;
}

// Added missing Appointment type
export interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  dateTime: string;
  duration: number;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
}

// Added missing Quote types
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED';

export interface QuoteItem {
  id: string;
  type: 'MATERIAL' | 'LABOR';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  clientName: string;
  title: string;
  date: string;
  items: QuoteItem[];
  marginPercentage: number;
  subtotal: number;
  marginAmount: number;
  total: number;
  status: QuoteStatus;
  author: string;
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  STOCK = 'STOCK',
  SALES = 'SALES',
  HISTORY = 'HISTORY',
  CREDITS = 'CREDITS',
  CASH = 'CASH',
  INVENTORY = 'INVENTORY',
  SETTINGS = 'SETTINGS',
  ADMIN_SPACE = 'ADMIN_SPACE'
}
