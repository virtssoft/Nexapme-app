
import { StockItem } from './types';

export const INITIAL_STOCK: StockItem[] = [];

export const CATEGORIES = ['Liquides', 'Céréales', 'Féculents', 'Épicerie', 'Conserves', 'Frais', 'Services', 'Matériel', 'Pièces'];

export const STORAGE_KEYS = {
  COMPANY: 'nexapme_company_config',
  STOCK: 'gestoalim_stock',
  SALES: 'gestoalim_sales',
  CREDITS: 'gestoalim_credits',
  CASH: 'gestoalim_cash',
  INVENTORY: 'gestoalim_inventory',
  RATE: 'gestoalim_rate',
  OPERATIONS: 'nexapme_operations',
  APPOINTMENTS: 'nexapme_appointments',
  USERS: 'nexapme_users_list',
  CURRENT_USER: 'nexapme_current_session',
  QUOTES: 'nexapme_quotes',
  SUBCATEGORIES: 'nexapme_subcategories' // Nouvelle clé
};
