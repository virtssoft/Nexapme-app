
import React, { useState, useEffect } from 'react';
import { View, CompanyConfig, UserProfile, LicenseInfo } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Sales from './pages/Sales';
import SalesHistory from './pages/SalesHistory';
import Credits from './pages/Credits';
import CashJournal from './pages/CashJournal';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import AdminSpace from './pages/AdminSpace';
import Chatbot from './components/Chatbot';
import Login from './pages/Login';
import Launcher from './components/Launcher';
import Branding from './components/Branding';
import { storageService } from './services/StorageService';
import { ApiService } from './services/ApiService';
import { Menu, LogOut, Loader2, Sparkles, CheckCircle, AlertCircle, User, LogOut as ExitIcon, X, Globe, CloudOff, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSwitchingSession, setIsSwitchingSession] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [activeLicense, setActiveLicense] = useState<LicenseInfo | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      ApiService.checkStatus().then(setApiOnline);
      setPendingSync(storageService.getPendingCount());

      const storedLicense = storageService.getLicense();
      if (storedLicense) {
        setActiveLicense(storedLicense);
        if (storedLicense.type === 'ADMIN') {
          setCurrentView(View.ADMIN_SPACE);
          setCurrentUser({ id: 'admin-root', name: 'Administrateur Nexa', role: 'ADMIN', pin: '' });
        } else {
          storageService.setActiveCompany(storedLicense.idUnique);
          setCompanyConfig(storageService.getCompanyInfo());
          const user = storageService.getCurrentUser();
          if (user) setCurrentUser(user);
        }
      }
      setTimeout(() => setIsInitializing(false), 1500);
    };
    restoreSession();

    const syncInterval = setInterval(() => {
      ApiService.checkStatus().then(setApiOnline);
      setPendingSync(storageService.getPendingCount());
    }, 10000);

    const handleUpdate = () => setPendingSync(storageService.getPendingCount());
    window.addEventListener('nexa_data_updated', handleUpdate);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('nexa_data_updated', handleUpdate);
    };
  }, []);

  const triggerSessionLoader = (callback: () => void) => {
    setIsSwitchingSession(true);
    setTimeout(() => {
      callback();
      setIsSwitchingSession(false);
    }, 800);
  };

  const handleLogoutOption = (type: 'SWITCH' | 'EXIT') => {
    setShowLogoutModal(false);
    triggerSessionLoader(() => {
      if (type === 'SWITCH') {
        storageService.setCurrentUser(null);
        setCurrentUser(null);
        setCurrentView(View.DASHBOARD);
      } else {
        storageService.clearLicense();
        setActiveLicense(null);
        setCompanyConfig(null);
        setCurrentUser(null);
      }
    });
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case View.DASHBOARD: return <Dashboard />;
      case View.STOCK: return <Stock />;
      case View.SALES: return <Sales />;
      case View.HISTORY: return <SalesHistory />;
      case View.CREDITS: return <Credits />;
      case View.CASH: return <CashJournal />;
      case View.INVENTORY: return <Inventory />;
      case View.SETTINGS: return <Settings onReset={() => storageService.clearLicense()} />;
      case View.ADMIN_SPACE: return <AdminSpace onLogout={() => setShowLogoutModal(true)} />;
      default: return <Dashboard />;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-1000">
        <div className="relative mb-12 flex flex-col items-center">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse"></div>
          <Sparkles className="text-emerald-500 mb-6 animate-bounce" size={64} />
          <h1 className="text-6xl font-black text-white tracking-tighter uppercase">
            nexa<span className="text-emerald-500">PME</span>
          </h1>
          <div className={`mt-8 px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center space-x-3 transition-colors ${apiOnline === null ? 'bg-slate-500/10 border-slate-500/30 text-slate-400' : apiOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            {apiOnline === null ? <Loader2 size={14} className="animate-spin" /> : apiOnline ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{apiOnline === null ? 'Liaison Cloud...' : apiOnline ? 'Cloud Nexa OK' : 'Cloud Inaccessible'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!activeLicense) return <Launcher onValidated={(license) => triggerSessionLoader(() => {
    setActiveLicense(license);
    if (license.type === 'ADMIN') {
      setCurrentView(View.ADMIN_SPACE);
      setCurrentUser({ id: 'admin-root', name: 'Administrateur Nexa', role: 'ADMIN', pin: '' });
    } else {
      setCompanyConfig(storageService.getCompanyInfo());
    }
  })} />;

  if (!currentUser) return <Login 
    onLogin={(user) => triggerSessionLoader(() => setCurrentUser(user))} 
    onExit={() => handleLogoutOption('EXIT')}
    companyName={companyConfig?.name || 'nexaPME'} 
    category={companyConfig?.owner ? `Propriétaire: ${companyConfig.owner}` : "Espace Client"} 
  />;

  const isAdminRoot = activeLicense.type === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative">
      {!isAdminRoot && (
        <Sidebar 
          currentView={currentView} 
          onNavigate={(v) => { setCurrentView(v); setIsSidebarOpen(false); }} 
          user={currentUser} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          companyName={companyConfig?.name || 'nexaPME'}
          onLogout={() => setShowLogoutModal(true)}
          onExitApp={() => setShowLogoutModal(true)}
        />
      )}
      
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Sync & Cloud Status Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between no-print sticky top-0 z-40">
           <div className="flex items-center space-x-4">
              {!isAdminRoot && (
                <button 
                  onClick={() => setIsSidebarOpen(true)} 
                  className="lg:hidden p-2 text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <Menu size={24} />
                </button>
              )}
              <Branding companyName={isAdminRoot ? "ROOT CONSOLE" : (companyConfig?.name || 'nexaPME')} category={isAdminRoot ? "Cloud Master" : "Cloud Control"} size="sm" />
           </div>
           <div className="flex items-center space-x-3">
              {pendingSync > 0 && (
                <div className="flex items-center space-x-2 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-xl border border-amber-400/20">
                  <RefreshCw size={12} className="animate-spin" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{pendingSync} Sync</span>
                </div>
              )}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-xl border ${apiOnline ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border-rose-400/20'}`}>
                <Globe size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">{apiOnline ? 'Online' : 'Offline'}</span>
              </div>
              <button onClick={() => setShowLogoutModal(true)} className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:bg-rose-600 transition-all ml-2"><LogOut size={16} /></button>
           </div>
        </div>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{renderCurrentView()}</div>
        </main>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-sm shadow-2xl overflow-hidden">
             <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest">
                  {isAdminRoot ? 'Fermer Session ROOT' : 'Session nexaPME'}
                </h3>
                <button onClick={() => setShowLogoutModal(false)}><X size={20} /></button>
             </div>
             <div className="p-8 space-y-4">
                {!isAdminRoot && (
                  <button onClick={() => handleLogoutOption('SWITCH')} className="w-full p-6 bg-slate-50 hover:bg-emerald-50 border-2 border-slate-100 rounded-3xl transition-all flex items-center space-x-4">
                    <User size={24} className="text-emerald-600" />
                    <span className="font-black text-slate-800 text-sm uppercase">Changer Vendeur</span>
                  </button>
                )}
                <button onClick={() => handleLogoutOption('EXIT')} className="w-full p-6 bg-slate-50 hover:bg-rose-50 border-2 border-slate-100 rounded-3xl transition-all flex items-center space-x-4">
                  <ExitIcon size={24} className="text-rose-600" />
                  <span className="font-black text-slate-800 text-sm uppercase">
                    {isAdminRoot ? 'Quitter la console' : 'Fermer Application'}
                  </span>
                </button>
             </div>
          </div>
        </div>
      )}

      {isSwitchingSession && (
        <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-xl flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-500" size={48} />
        </div>
      )}
      {!isAdminRoot && <Chatbot />}
    </div>
  );
};

export default App;
