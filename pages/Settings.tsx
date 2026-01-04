
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { CompanyConfig, UserProfile, View } from '../types';
import Branding from '../components/Branding';
import { ApiService } from '../services/ApiService';
import { 
  Building2, User, ShieldCheck, Save, Users, Plus, X, KeyRound, 
  AlertCircle, RefreshCw, Loader2, Trash2, CheckCircle2, DollarSign, MapPin, Tag
} from 'lucide-react';

interface SettingsProps {
  onReset: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onReset }) => {
  const currentUser = storageService.getCurrentUser();
  const isManager = currentUser?.role === 'MANAGER';
  
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [users, setUsers] = useState<UserProfile[]>(storageService.getUsers());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  
  const [selectedUserForPin, setSelectedUserForPin] = useState<UserProfile | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinUpdateStatus, setPinUpdateStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE');

  const [newUser, setNewUser] = useState<Partial<UserProfile>>({ 
    role: 'WORKER', 
    permissions: [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY] 
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [remoteConfig, remoteUsers] = await Promise.all([
        storageService.fetchCompanyConfigRemote(),
        storageService.fetchUsers()
      ]);
      setConfig(remoteConfig);
      setUsers(remoteUsers);
    } catch (e) { console.error("Load failed", e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => setUsers(storageService.getUsers());
    window.addEventListener('nexa_data_updated', handleUpdate);
    return () => window.removeEventListener('nexa_data_updated', handleUpdate);
  }, []);

  const handleUpdatePin = async () => {
    if (selectedUserForPin && newPin.length === 4) {
      setPinUpdateStatus('LOADING');
      try {
        await ApiService.updateUser({
          id: selectedUserForPin.id,
          name: selectedUserForPin.name,
          role: selectedUserForPin.role,
          pin: newPin
        });
        
        setPinUpdateStatus('SUCCESS');
        setTimeout(() => {
          setIsPinModalOpen(false);
          setSelectedUserForPin(null);
          setNewPin('');
          setPinUpdateStatus('IDLE');
          loadData();
        }, 1500);
      } catch (e: any) { 
        alert("Erreur Cloud: Impossible de modifier le PIN. " + e.message); 
        setPinUpdateStatus('IDLE');
      }
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await storageService.saveCompanyConfigRemote(config);
      // On met aussi à jour le taux en local
      if (config.exchange_rate) {
        storageService.updateExchangeRate(Number(config.exchange_rate));
      }
      alert("Configuration mise à jour avec succès !");
    } catch (e: any) {
      alert("Erreur sauvegarde: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isManager) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-4">
        <ShieldCheck size={64} className="text-slate-200" />
        <h3 className="text-xl font-black text-slate-800 uppercase">Accès Réservé</h3>
        <p className="text-slate-500 max-w-xs">Seul le gérant de l'entreprise peut configurer les accès et l'équipe.</p>
      </div>
    );
  }

  if (isLoading) return <div className="flex flex-col items-center justify-center py-40 space-y-4">
    <Loader2 className="animate-spin text-emerald-500" size={48} />
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chargement Cloud...</p>
  </div>;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in">
      <header className="flex justify-between items-end">
        <Branding companyName={config?.name || ''} category="Paramètres Cloud & Taux" size="lg" variant="light" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
              <Building2 className="text-emerald-500" size={24} />
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Identité & Fiscalité</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase px-2 flex items-center gap-1"><Tag size={10} /> Nom de la PME</label>
                   <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-emerald-500" value={config?.name || ''} onChange={e => setConfig(prev => prev ? {...prev, name: e.target.value} : null)} />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase px-2 flex items-center gap-1"><AlertCircle size={10} /> RCCM / ID Fiscal</label>
                   <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-emerald-500" placeholder="CD/GOM/RCCM..." value={config?.tax_id || ''} onChange={e => setConfig(prev => prev ? {...prev, tax_id: e.target.value} : null)} />
                </div>
                <div className="space-y-1 col-span-full">
                   <label className="text-[9px] font-black text-slate-400 uppercase px-2 flex items-center gap-1"><MapPin size={10} /> Adresse Physique</label>
                   <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-emerald-500" placeholder="Av. du Lac, Goma..." value={config?.address || ''} onChange={e => setConfig(prev => prev ? {...prev, address: e.target.value} : null)} />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center space-x-3 mb-6">
                  <DollarSign className="text-blue-500" size={24} />
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Gestion Monétaire (Taux)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-2">Devise Principale</label>
                    <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none" value={config?.currency || 'FC'} onChange={e => setConfig(prev => prev ? {...prev, currency: e.target.value as any} : null)}>
                      <option value="FC">Franc Congolais (FC)</option>
                      <option value="USD">Dollar Américain (USD)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-blue-600 uppercase px-2">Taux de Change (1$ = ?)</label>
                    <input type="number" className="w-full px-6 py-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black text-blue-600 outline-none" placeholder="2850" value={config?.exchange_rate || ''} onChange={e => setConfig(prev => prev ? {...prev, exchange_rate: e.target.value as any} : null)} />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveConfig} 
                disabled={isSaving}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 hover:bg-black transition-all disabled:opacity-50 mt-4"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
                <span>Sauvegarder les Paramètres Cloud</span>
              </button>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="text-blue-500" size={24} />
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Gestion du Personnel</h3>
              </div>
              <button onClick={() => setIsUserModalOpen(true)} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                <Plus size={16} /> Nouveau Vendeur
              </button>
            </div>
            <div className="p-8 space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${u.role === 'MANAGER' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}><User size={18} /></div>
                    <div className="text-left">
                       <p className="font-black text-slate-800 text-sm uppercase">{u.name}</p>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{u.role === 'MANAGER' ? 'ADMINISTRATEUR' : 'VENDEUR'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => { setSelectedUserForPin(u); setIsPinModalOpen(true); }} className="p-3 bg-white text-slate-400 hover:text-emerald-500 rounded-xl shadow-sm border border-slate-100" title="Changer PIN">
                       <KeyRound size={18} />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => { if(confirm("Supprimer cet accès ?")) storageService.removeUser(u.id); }} className="p-3 bg-white text-rose-300 hover:text-rose-500 rounded-xl shadow-sm border border-slate-100">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[2.5rem] space-y-6 shadow-sm text-center">
            <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto text-rose-500">
               <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
               <h3 className="font-black text-rose-800 uppercase text-xs tracking-widest">Paramètres de Licence</h3>
               <p className="text-[10px] font-bold text-rose-400 uppercase leading-relaxed">Cette action supprimera toutes les données locales.</p>
            </div>
            <button onClick={onReset} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-rose-700">Réinitialiser l'App</button>
          </div>
        </div>
      </div>

      {isPinModalOpen && selectedUserForPin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center text-left">
              <div>
                <h3 className="font-black uppercase tracking-widest text-[10px]">Changement de Code PIN</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{selectedUserForPin.name}</p>
              </div>
              <button onClick={() => setIsPinModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              {pinUpdateStatus === 'SUCCESS' ? (
                <div className="py-10 text-center space-y-4 animate-in fade-in">
                   <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                   </div>
                   <p className="font-black text-emerald-600 uppercase text-xs tracking-widest">Code mis à jour avec succès !</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Nouveau Code (4 chiffres)</label>
                    <input 
                      type="password" 
                      maxLength={4} 
                      className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] font-black text-center text-3xl tracking-[0.8em] outline-none focus:border-emerald-500" 
                      placeholder="••••"
                      value={newPin} 
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} 
                    />
                  </div>
                  <button 
                    onClick={handleUpdatePin} 
                    disabled={newPin.length !== 4 || pinUpdateStatus === 'LOADING'} 
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3"
                  >
                    {pinUpdateStatus === 'LOADING' ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                    <span>Mettre à jour le PIN</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center text-left">
              <h3 className="font-black uppercase tracking-widest text-[10px]">Créer un Nouvel Accès</h3>
              <button onClick={() => setIsUserModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4 text-left">
              <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-500" placeholder="Nom Complet" value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="WORKER">Accès Vendeur</option>
                <option value="MANAGER">Accès Gérant</option>
              </select>
              <input type="password" maxLength={4} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center text-xl tracking-[0.4em]" placeholder="PIN (4 chiffres)" value={newUser.pin || ''} onChange={e => setNewUser({...newUser, pin: e.target.value.replace(/\D/g, ''))} />
              <button onClick={async () => {
                if(!newUser.name || !newUser.pin) { alert("Nom et PIN requis"); return; }
                await storageService.addUser(newUser as any);
                setIsUserModalOpen(false);
                loadData();
              }} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Créer l'Accès Cloud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
