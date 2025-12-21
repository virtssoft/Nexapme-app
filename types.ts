
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
  idUnique: string;
  name: string;
  owner: string;
  licenseKey: string;
  licenseType: LicenseType;
  expiryDate?: string;
  createdAt: string;
}

export type ModuleDomain = 'FOOD_RETAIL' | 'TECH_SERVICES' | 'REAL_ESTATE' | 'MEDIA' | 'LOGISTICS' | 'FITNESS' | 'BEAUTY' | 'COMMERCE';

export interface SubCategory {
  id: string;
  name: string;
  parentCategory: string;
}

export interface CompanyConfig {
  idUnique: string;
  name: string;
  owner: string;
  currency: 'FC' | 'USD';
  setupDate: string;
  taxId?: string;
  rccm?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxPercentage?: number;
  receiptFooter?: string;
  domain?: ModuleDomain;
  subDomain?: string;
  bankDetails?: string;
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
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
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
