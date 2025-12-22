
import React from 'react';
import { View, UserProfile } from '../types';
import Branding from './Branding';
import { 
  LayoutDashboard, Package, ShoppingCart, History, CreditCard, 
  Wallet, ClipboardCheck, Settings, LogOut, X, Home
} from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  onLogout: () => void;
  onExitApp: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, user, isOpen, onClose, companyName, onLogout, onExitApp }) => {
  const isManager = user.role === 'MANAGER';

  const menuItems = [
    { label: 'Tableau de Bord', icon: LayoutDashboard, view: View.DASHBOARD, roles: ['MANAGER', 'WORKER'] },
    { label: 'Caisse Vente', icon: ShoppingCart, view: View.SALES, roles: ['MANAGER', 'WORKER'] },
    { label: 'Gestion Stock', icon: Package, view: View.STOCK, roles: ['MANAGER', 'WORKER'] },
    { label: 'Historique', icon: History, view: View.HISTORY, roles: ['MANAGER', 'WORKER'] },
    { label: 'Crédits Clients', icon: CreditCard, view: View.CREDITS, roles: ['MANAGER'] },
    { label: 'Journal Caisse', icon: Wallet, view: View.CASH, roles: ['MANAGER'] },
    { label: 'Inventaires', icon: ClipboardCheck, view: View.INVENTORY, roles: ['MANAGER'] },
    { label: 'Paramètres', icon: Settings, view: View.SETTINGS, roles: ['MANAGER'] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={onClose} 
      />

      <aside className={`
        fixed top-0 left-0 z-[70] 
        h-[100dvh] w-64 
        bg-slate-900 text-white 
        flex flex-col overflow-hidden
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:sticky lg:top-0 lg:h-screen
      `}>
        
        <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
          <Branding companyName={companyName} category={isManager ? "Administration" : "Session Vendeur"} size="sm" />
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar min-h-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button 
                key={item.view} 
                onClick={() => onNavigate(item.view)} 
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon size={18} />
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-900/50 shrink-0">
          <div className="px-4 py-3 bg-slate-800/30 rounded-xl flex items-center space-x-3 border border-slate-800/50">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${isManager ? 'bg-emerald-500 text-slate-900' : 'bg-blue-500 text-white'}`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate">{user.name}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{isManager ? 'Gérant' : 'Vendeur'}</p>
            </div>
          </div>
          
          <div className="flex flex-col space-y-1">
            <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-2.5 text-rose-400 hover:bg-rose-900/20 rounded-xl transition-all group">
              <LogOut size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fermer Session</span>
            </button>
            <button onClick={onExitApp} className="w-full flex items-center space-x-3 px-4 py-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all group">
              <Home size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Quitter Licence</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
