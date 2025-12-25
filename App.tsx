
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
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import AdminSpace from './pages/AdminSpace';
import Chatbot from './components/Chatbot';
import NotificationCenter from './components/NotificationCenter';
import Login from './pages/Login';
import Launcher from './components/Launcher';
import Branding from './components/Branding';
import { storageService } from './services/StorageService';
import { ApiService } from './services/ApiService';
import { Menu, LogOut, ShieldAlert, Loader2, Sparkles, CheckCircle, AlertCircle, User, LogOut as ExitIcon, X } from 'lucide-react';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [isSwitchingSession, setIsSwitchingSession] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [activeLicense, setActiveLicense] = useState<LicenseInfo | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      const isOnline = await ApiService.checkStatus();
      setApiOnline(isOnline);

      const storedLicense = storageService.getLicense();
      if (storedLicense) {
        setActiveLicense(storedLicense);
        
        if (storedLicense.type === 'ADMIN') {
          // FORCE ADMIN VIEW
          setCurrentView(View.ADMIN_SPACE);
        } else {
          storageService.setActiveCompany(storedLicense.idUnique);
          const config = storageService.getCompanyInfo();
          if (config) setCompanyConfig(config);
          
          const user = storageService.getCurrentUser();
          if (user) setCurrentUser(user);
        }
      }
      setTimeout(() => setIsInitializing(false), 2500);
    };
    restoreSession();
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
      case View.ADMIN_SPACE: return <AdminSpace />;
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
          <div className={`mt-8 px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center space-x-3 ${apiOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            {apiOnline === null ? <Loader2 size={14} className="animate-spin" /> : apiOnline ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{apiOnline === null ? 'Liaison...' : apiOnline ? 'Serveur Cloud OK' : 'Mode Hors-Ligne'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!activeLicense) {
    return <Launcher onValidated={(license) => triggerSessionLoader(() => {
      setActiveLicense(license);
      if (license.type === 'ADMIN') {
        setCurrentView(View.ADMIN_SPACE);
      }
    })} />;
  }

  if (!companyConfig && activeLicense.type !== 'ADMIN') {
    return <Onboarding onComplete={(config) => triggerSessionLoader(() => {
      setCompanyConfig(config);
      setCurrentUser(storageService.getCurrentUser());
    })} />;
  }

  if (!currentUser && activeLicense.type !== 'ADMIN') {
    return <Login 
      onLogin={(user) => triggerSessionLoader(() => setCurrentUser(user))} 
      onExit={() => handleLogoutOption('EXIT')}
      companyName={companyConfig?.name || ''} 
      category={companyConfig?.subDomain || "Gestion"} 
    />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative">
      <Sidebar 
        currentView={currentView} 
        onNavigate={(v) => { setCurrentView(v); setIsSidebarOpen(false); }} 
        user={currentUser || { name: 'Super Admin', role: 'ADMIN', id: '0', pin: '' }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        companyName={companyConfig?.name || 'ROOT ADMIN'}
        onLogout={() => setShowLogoutModal(true)}
        onExitApp={() => setShowLogoutModal(true)}
      />
      
      <header className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2"><Menu size={24} /></button>
        <Branding companyName={companyConfig?.name || 'nexaPME ROOT'} category="Cloud Control" size="sm" />
        <button onClick={() => setShowLogoutModal(true)} className="p-2 bg-rose-500 rounded-lg"><LogOut size={18} /></button>
      </header>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{renderCurrentView()}</div>
      </main>

      {/* Modal Déconnexion à Choix */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest">Déconnexion</h3>
                <button onClick={() => setShowLogoutModal(false)}><X size={20} /></button>
             </div>
             <div className="p-8 space-y-4">
                {activeLicense?.type !== 'ADMIN' && (
                  <button 
                    onClick={() => handleLogoutOption('SWITCH')}
                    className="w-full p-6 bg-slate-50 hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-500 rounded-3xl transition-all flex items-center space-x-4 group"
                  >
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <User size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800 text-sm uppercase">Changer d'utilisateur</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Retour au choix du personnel</p>
                    </div>
                  </button>
                )}

                <button 
                  onClick={() => handleLogoutOption('EXIT')}
                  className="w-full p-6 bg-slate-50 hover:bg-rose-50 border-2 border-slate-100 hover:border-rose-500 rounded-3xl transition-all flex items-center space-x-4 group"
                >
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all">
                    <ExitIcon size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-800 text-sm uppercase">Quitter l'entreprise</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Retour à l'accueil licence</p>
                  </div>
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
      <Chatbot />
    </div>
  );
};

export default App;
