
import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';
import { PMEEntry, UserRole } from '../types';
import { 
  Plus, Trash2, Search, 
  RefreshCw, ChevronLeft, Copy, CheckCircle2, 
  Loader2, Edit3, Save, 
  ShieldCheck, User, KeyRound,
  Users, Shield, Eye, EyeOff, Building2, UserCircle2,
  Lock, UserPlus, ArrowLeft, AlertTriangle, Zap, LogOut,
  Calendar
} from 'lucide-react';

type AdminView = 'LIST' | 'PME_FORM' | 'USER_LIST' | 'USER_FORM';

interface AdminSpaceProps {
  onLogout?: () => void;
}

const AdminSpace: React.FC<AdminSpaceProps> = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState<AdminView>('LIST');
  const [pmeList, setPmeList] = useState<PMEEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // PME State
  const [editingPme, setEditingPme] = useState<PMEEntry | null>(null);
  const [pmeFormData, setPmeFormData] = useState({
    id: '',
    name: '',
    owner_name: '',
    license_key: '',
    license_type: 'NORMAL' as any,
    expiry_months: '12',
    status: 'ACTIVE'
  });

  // User Management State
  const [selectedPmeForUsers, setSelectedPmeForUsers] = useState<PMEEntry | null>(null);
  const [pmeUsers, setPmeUsers] = useState<any[]>([]);
  const [isUserActionLoading, setIsUserActionLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({
    id: '',
    name: '',
    role: 'WORKER' as UserRole,
    pin: '',
    permissions: { sales: true, stock: false, history: false, credits: false, cash: false, inventory: false, settings: false }
  });

  useEffect(() => {
    loadPmes();
    checkConn();
  }, []);

  const checkConn = async () => {
    const online = await ApiService.checkStatus();
    setServerOnline(online);
  };

  const loadPmes = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getAdminPmes();
      setPmeList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load PMES", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsersForPme = async (pmeId: string) => {
    setIsUserActionLoading(true);
    try {
      const users = await ApiService.getUsers(pmeId);
      setPmeUsers(Array.isArray(users) ? users : []);
    } catch (e) {
      console.error("Failed to load users", e);
    } finally {
      setIsUserActionLoading(false);
    }
  };

  const getNextAvailableId = (prefix: string, list: any[]) => {
    const nums = list
      .map(item => {
        const parts = String(item.id).split('-');
        return parts.length > 1 ? parseInt(parts[1]) : 0;
      })
      .filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `${prefix}-${(max + 1).toString().padStart(4, '0')}`;
  };

  const generateRandomUserId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `USR-${randomPart}`;
  };

  const generateLicenseKey = () => {
    return 'LIC-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
  };

  const goToAddPme = () => {
    setEditingPme(null);
    setPmeFormData({
      id: getNextAvailableId('PME', pmeList),
      name: '',
      owner_name: '',
      license_key: generateLicenseKey(),
      license_type: 'NORMAL',
      expiry_months: '12',
      status: 'ACTIVE'
    });
    setCurrentView('PME_FORM');
  };

  const goToEditPme = (pme: PMEEntry) => {
    setEditingPme(pme);
    setPmeFormData({ ...pme, expiry_months: '12' } as any);
    setCurrentView('PME_FORM');
  };

  const handleSavePme = async () => {
    if (!pmeFormData.name || !pmeFormData.owner_name) {
      alert("Erreur: Nom et Gérant obligatoires.");
      return;
    }
    setIsLoading(true);
    try {
      if (editingPme) {
        const { expiry_months, ...baseData } = pmeFormData;
        await ApiService.updateAdminPme(baseData);
      } else {
        // Logique conforme à la documentation technique : /admin/pme/create.php
        const payload: any = {
          id: pmeFormData.id,
          name: pmeFormData.name,
          owner_name: pmeFormData.owner_name,
          license_key: pmeFormData.license_key,
          license_type: pmeFormData.license_type,
        };
        
        // Pour le type NORMAL, duration doit être 6 ou 12 (integer)
        if (pmeFormData.license_type === 'NORMAL') {
          payload.duration = parseInt(pmeFormData.expiry_months);
        }
        
        await ApiService.createAdminPme(payload);
      }
      
      await loadPmes();
      setCurrentView('LIST');
    } catch (e: any) {
      alert("ERREUR CREATION CLOUD: " + (e.message || "Le serveur a refusé la requête."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePme = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette PME ?")) return;
    setIsLoading(true);
    try {
      await ApiService.deleteAdminPme(id);
      await loadPmes();
    } catch (e: any) {
      alert("Erreur lors de la suppression : " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToUserList = (pme: PMEEntry) => {
    setSelectedPmeForUsers(pme);
    loadUsersForPme(pme.id);
    setCurrentView('USER_LIST');
  };

  const goToAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      id: generateRandomUserId(),
      name: '',
      role: 'WORKER',
      pin: '',
      permissions: { sales: true, stock: false, history: false, credits: false, cash: false, inventory: false, settings: false }
    });
    setCurrentView('USER_FORM');
  };

  const goToEditUser = (user: any) => {
    setEditingUser(user);
    setUserFormData({ 
      ...user, 
      pin: '', 
      permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions 
    });
    setCurrentView('USER_FORM');
  };

  const handleSaveUser = async () => {
    if (!selectedPmeForUsers) return;
    if (!userFormData.name || (!editingUser && userFormData.pin.length !== 4)) {
      alert("Veuillez remplir le nom et un PIN à 4 chiffres.");
      return;
    }

    setIsUserActionLoading(true);
    try {
      if (editingUser) {
        await ApiService.updateUser({
          id: userFormData.id,
          name: userFormData.name,
          role: userFormData.role,
          permissions: JSON.stringify(userFormData.permissions)
        });
      } else {
        await ApiService.createUser({
          id: userFormData.id,
          pme_id: selectedPmeForUsers.id,
          name: userFormData.name,
          role: userFormData.role,
          pin: userFormData.pin,
          permissions: JSON.stringify(userFormData.permissions)
        });
      }
      await loadUsersForPme(selectedPmeForUsers.id);
      setCurrentView('USER_LIST');
    } catch (e: any) {
      alert("Erreur Utilisateur : " + e.message);
    } finally {
      setIsUserActionLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setIsUserActionLoading(true);
    try {
      await ApiService.toggleUserStatus(user.id, newStatus);
      if (selectedPmeForUsers) await loadUsersForPme(selectedPmeForUsers.id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsUserActionLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    setIsUserActionLoading(true);
    try {
      await ApiService.deleteUser(id);
      if (selectedPmeForUsers) await loadUsersForPme(selectedPmeForUsers.id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsUserActionLoading(false);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const LogoutButton = () => (
    <button onClick={onLogout} className="px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm shrink-0">
      <LogOut size={16} />
      <span className="hidden sm:inline">Déconnexion</span>
    </button>
  );

  if (currentView === 'LIST') {
    return (
      <div className="space-y-8 view-transition">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl shadow-2xl">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none text-left">
                  nexa<span className="text-emerald-500">ROOT</span>
                </h1>
                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.4em] mt-1 text-left">Console Administrative Universelle</p>
              </div>
            </div>
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${serverOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
              <span>{serverOnline ? 'Cloud Nexa Actif' : 'Cloud Déconnecté'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button onClick={goToAddPme} className="flex-1 lg:flex-none px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
              <Plus size={20} />
              <span>Créer Licence</span>
            </button>
            <LogoutButton />
          </div>
        </header>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-3">
          <Search size={20} className="text-slate-400" />
          <input type="text" placeholder="Chercher une PME..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={loadPmes} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && pmeList.length === 0 ? (
             <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 size={48} className="animate-spin text-emerald-500" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Récupération des données Cloud...</p>
             </div>
          ) : pmeList.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:border-emerald-500 transition-all group">
              <div className="p-8 space-y-6 flex-1 text-left">
                <div className="flex justify-between items-start">
                  <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] ${p.license_type === 'ADMIN' ? 'bg-slate-900 text-emerald-400' : p.license_type === 'UNIVERSAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {p.license_type}
                  </span>
                  <div className="flex space-x-1">
                    <button onClick={() => goToUserList(p)} className="p-2 text-slate-300 hover:text-blue-500"><Users size={18} /></button>
                    <button onClick={() => goToEditPme(p)} className="p-2 text-slate-300 hover:text-emerald-500"><Edit3 size={18} /></button>
                    <button onClick={() => handleDeletePme(p.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.id}</p>
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none truncate">{p.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 flex items-center space-x-2 mt-2 uppercase">
                    <User size={12} className="text-slate-300" />
                    <span>{p.owner_name}</span>
                  </p>
                </div>
                <div className="p-4 bg-slate-900 rounded-[1.5rem] flex items-center justify-between border border-white/5 shadow-inner">
                  <p className="font-mono font-black text-emerald-400 text-[10px] tracking-widest truncate mr-4">{p.license_key}</p>
                  <button onClick={() => copyToClipboard(p.license_key)} className="text-slate-500 hover:text-white shrink-0">
                    {copiedKey === p.license_key ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span className={p.status === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'}>{p.status}</span>
                <span>EXP: {p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : 'ILLIMITÉ'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (currentView === 'PME_FORM') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 view-transition text-left">
        <div className="flex justify-between items-center px-2">
          <button onClick={() => setCurrentView('LIST')} className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">
            <ArrowLeft size={16} /> <span>Retour à la liste</span>
          </button>
          <LogoutButton />
        </div>
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-10 bg-slate-900 text-white flex items-center space-x-6">
            <div className="p-5 bg-emerald-500 rounded-3xl text-slate-900 shadow-xl"><Building2 size={32} /></div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{editingPme ? 'Modifier PME' : 'Nouvelle PME'}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID SYSTÈME: {pmeFormData.id}</p>
            </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Nom Commercial *</label>
                <input type="text" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-[2rem] font-black text-lg uppercase outline-none transition-all" value={pmeFormData.name} onChange={(e) => setPmeFormData({...pmeFormData, name: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Nom du Gérant *</label>
                <input type="text" className="w-full px-8 py-4 bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-[1.8rem] font-bold outline-none" value={pmeFormData.owner_name} onChange={(e) => setPmeFormData({...pmeFormData, owner_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Clé de Licence</label>
                <div className="relative">
                  <input type="text" className="w-full pl-8 pr-16 py-4 rounded-[1.8rem] font-mono font-black text-sm bg-emerald-50 text-emerald-700 border-2 border-emerald-100 outline-none uppercase" value={pmeFormData.license_key} onChange={(e) => setPmeFormData({...pmeFormData, license_key: e.target.value.toUpperCase()})} />
                  <button onClick={() => setPmeFormData({...pmeFormData, license_key: generateLicenseKey()})} className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-600"><RefreshCw size={22} /></button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Type de Licence</label>
                <div className="grid grid-cols-1 gap-2">
                  {['NORMAL', 'UNIVERSAL', 'ADMIN'].map(type => (
                    <button key={type} onClick={() => setPmeFormData({...pmeFormData, license_type: type as any})} className={`p-4 rounded-2xl border-2 text-left flex items-center space-x-4 transition-all ${pmeFormData.license_type === type ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-100 bg-slate-50'}`}>
                      <Zap size={20} className={pmeFormData.license_type === type ? 'text-emerald-500' : 'text-slate-300'} />
                      <span className={`text-[11px] font-black uppercase ${pmeFormData.license_type === type ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {type === 'NORMAL' ? 'Standard (Abonnement)' : type === 'UNIVERSAL' ? 'Universelle (Illimité)' : 'Root (Admin System)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {pmeFormData.license_type === 'NORMAL' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest flex items-center gap-2">
                    <Calendar size={12} /> Durée de l'Abonnement
                  </label>
                  <select 
                    className="w-full px-8 py-4 bg-blue-50 border-2 border-blue-100 rounded-[1.8rem] font-black text-blue-700 outline-none focus:border-blue-500 transition-all"
                    value={pmeFormData.expiry_months}
                    onChange={(e) => setPmeFormData({...pmeFormData, expiry_months: e.target.value})}
                  >
                    <option value="6">6 Mois</option>
                    <option value="12">12 Mois (1 An)</option>
                  </select>
                </div>
              )}
            </div>
            <div className="pt-8 flex flex-col md:flex-row gap-4">
               <button onClick={() => setCurrentView('LIST')} className="flex-1 py-6 rounded-[2rem] border-2 border-slate-200 text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50">Annuler</button>
               <button onClick={handleSavePme} disabled={isLoading} className="flex-[2] py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all">
                  {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                  <span>{editingPme ? 'Sauvegarder' : 'Activer Licence'}</span>
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;
};

export default AdminSpace;
