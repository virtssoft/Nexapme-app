
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
import { Menu, LogOut, ShieldAlert, Loader2, Sparkles, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [isSwitchingSession, setIsSwitchingSession] = useState(false);
  
  const [activeLicense, setActiveLicense] = useState<LicenseInfo | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      // 1. Vérification PRIORITAIRE de l'API Cloud sur /api/index.php
      const isOnline = await ApiService.checkStatus();
      setApiOnline(isOnline);

      // 2. Restauration des données locales
      const storedLicense = storageService.getLicense();
      if (storedLicense) {
        setActiveLicense(storedLicense);
        
        if (storedLicense.type !== 'ADMIN') {
          storageService.setActiveCompany(storedLicense.idUnique);
          const config = storageService.getCompanyInfo();
          if (config) setCompanyConfig(config);
          
          const user = storageService.getCurrentUser();
          if (user) setCurrentUser(user);
        } else {
          setCurrentView(View.ADMIN_SPACE);
        }
      }
      
      // Temps minimum pour apprécier l'écran de splash (et voir le statut API)
      setTimeout(() => setIsInitializing(false), 3000);
    };

    restoreSession();
  }, []);

  const triggerSessionLoader = (callback: () => void) => {
    setIsSwitchingSession(true);
    setTimeout(() => {
      callback();
      setIsSwitchingSession(false);
    }, 1000);
  };

  const handleReset = () => {
    if (confirm("ATTENTION : Cette action supprimera TOUTES les données. Continuer ?")) {
      storageService.resetAll();
    }
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
      case View.SETTINGS: return <Settings onReset={handleReset} />;
      case View.ADMIN_SPACE: return <AdminSpace />;
      default: return <Dashboard />;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-1000">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-emerald-500/30 blur-[80px] rounded-full animate-pulse"></div>
          <div className="relative bg-slate-900/50 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col items-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-shimmer"></div>
            <Sparkles className="text-emerald-500 mb-6 animate-bounce" size={56} />
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase flex items-center">
              nexa<span className="text-emerald-500">PME</span>
            </h1>
            
            {/* Affichage du message de succès ou d'erreur API */}
            <div className={`mt-6 px-6 py-2.5 rounded-2xl border flex items-center space-x-3 transition-all duration-700 shadow-lg ${
              apiOnline === null ? 'bg-slate-800/50 border-slate-700 text-slate-400' :
              apiOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10' :
              'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10'
            }`}>
              {apiOnline === null ? <Loader2 size={16} className="animate-spin" /> : 
               apiOnline ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                {apiOnline === null ? 'Vérification de l\'API...' : 
                 apiOnline ? 'SUCCÈS : Liaison Cloud Établie' : 'ERREUR : Serveur Cloud Inaccessible'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
          </div>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">
            {apiOnline === false ? 'Chargement en mode déconnecté...' : 'Démarrage du système...'}
          </p>
        </div>
      </div>
    );
  }

  if (!activeLicense) {
    return <Launcher onValidated={(license) => {
      triggerSessionLoader(() => {
        setActiveLicense(license);
        if (license.type === 'ADMIN') {
          setCurrentView(View.ADMIN_SPACE);
        } else {
          const config = storageService.getCompanyInfo();
          if (config) setCompanyConfig(config);
        }
      });
    }} />;
  }

  if (activeLicense.type === 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-slate-900 p-6 text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20"></div>
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
               <ShieldAlert className="text-emerald-500" size={24} />
             </div>
             <div>
               <h2 className="font-black text-lg uppercase tracking-widest leading-none">ESPACE ROOT</h2>
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Console Cloud Management</p>
             </div>
          </div>
          <button 
            onClick={() => triggerSessionLoader(() => { storageService.clearLicense(); setActiveLicense(null); })} 
            className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs uppercase flex items-center space-x-2 transition-all shadow-lg shadow-rose-900/20"
          >
            <LogOut size={16} /> <span>Quitter Admin</span>
          </button>
        </header>
        <main className="p-4"><AdminSpace /></main>
        {isSwitchingSession && <SessionLoader />}
      </div>
    );
  }

  if (!companyConfig) {
    return <Onboarding onComplete={(config) => {
      triggerSessionLoader(() => {
        setCompanyConfig(config);
        setCurrentUser(storageService.getCurrentUser());
      });
    }} />;
  }

  if (!currentUser) {
    return <Login 
      onLogin={(user) => triggerSessionLoader(() => setCurrentUser(user))} 
      companyName={companyConfig.name} 
      category={companyConfig.subDomain || "Commerce"} 
    />;
  }

  const handleNavigate = (view: View) => {
    const permissions = currentUser.permissions || [];
    if (permissions.length === 0) {
       const defaults = storageService.getDefaultPermissions(currentUser.role);
       if (!defaults.includes(view)) {
         alert("Accès refusé. Cette fonctionnalité ne fait pas partie de vos droits.");
         return;
       }
    } else if (!permissions.includes(view)) {
      alert("Accès refusé. Veuillez contacter l'administrateur.");
      return;
    }

    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    triggerSessionLoader(() => {
      storageService.setCurrentUser(null);
      setCurrentUser(null);
      setCurrentView(View.DASHBOARD);
    });
  };

  const handleExitApp = () => {
    if (confirm("Voulez-vous quitter l'application ?")) {
      triggerSessionLoader(() => {
        storageService.clearLicense();
        setActiveLicense(null);
        setCompanyConfig(null);
        setCurrentUser(null);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        user={currentUser} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        companyName={companyConfig.name}
        onLogout={handleLogout}
        onExitApp={handleExitApp}
      />
      
      <header className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg">
            <Menu size={24} />
          </button>
          <Branding companyName={companyConfig.name} category="Cloud PME" size="sm" />
        </div>
        <div className="flex items-center space-x-2">
          <NotificationCenter />
          <button onClick={handleLogout} className="p-2 bg-rose-500 rounded-xl text-white shadow-lg"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {renderCurrentView()}
        </div>
      </main>

      {isSwitchingSession && <SessionLoader />}
      <Chatbot />
    </div>
  );
};

const SessionLoader = () => (
  <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
    <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col items-center">
       <div className="relative mb-8">
         <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
         <Loader2 className="animate-spin text-emerald-500 relative z-10" size={56} />
       </div>
       <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] animate-pulse">Traitement Cloud...</p>
    </div>
  </div>
);

export default App;
