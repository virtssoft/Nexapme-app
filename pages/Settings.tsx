
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { CompanyConfig, UserProfile, UserRole, View, SubCategory } from '../types';
import Branding from '../components/Branding';
import { CATEGORIES } from '../constants';
import { 
  Building2, User, Wallet, RefreshCw, Trash2, ShieldCheck, 
  Save, Users, Plus, X, KeyRound, AlertCircle, MapPin, Phone, Mail, Landmark, Percent, Tags, ChevronRight, Camera, Mic, Navigation, Download, Upload, FileJson
} from 'lucide-react';

interface SettingsProps {
  onReset: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onReset }) => {
  const [config, setConfig] = useState<CompanyConfig | null>(storageService.getCompanyInfo());
  const [users, setUsers] = useState<UserProfile[]>(storageService.getUsers());
  const [subCategories, setSubCategories] = useState<SubCategory[]>(storageService.getSubCategories());
  const [isSaving, setIsSaving] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSubCatModalOpen, setIsSubCatModalOpen] = useState(false);
  
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({ 
    role: 'WORKER', 
    permissions: [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY] 
  });
  const [newSubCat, setNewSubCat] = useState<Partial<SubCategory>>({ parentCategory: CATEGORIES[0] });

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        storageService.importDataFromJSON(text);
      };
      reader.readAsText(file);
    }
  };

  const requestPermission = async (type: 'camera' | 'mic' | 'geo') => {
    try {
      if (type === 'camera') {
        await navigator.mediaDevices.getUserMedia({ video: true });
        alert("Autorisation Caméra accordée !");
      } else if (type === 'mic') {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        alert("Autorisation Micro accordée !");
      } else if (type === 'geo') {
        navigator.geolocation.getCurrentPosition(() => {
          alert("Autorisation Localisation accordée !");
        }, (err) => {
          alert("Erreur Localisation : " + err.message);
        });
      }
    } catch (err: any) {
      alert("Erreur d'autorisation : " + err.message + ". Vérifiez que vous êtes en HTTPS.");
    }
  };

  const handleSaveConfig = () => {
    if (config) {
      setIsSaving(true);
      storageService.saveCompanyInfo(config);
      setTimeout(() => { 
        setIsSaving(false); 
        alert("Configuration mise à jour avec succès.");
      }, 500);
    }
  };

  const handleAddUser = () => {
    if (newUser.name && newUser.pin?.length === 4) {
      const u: UserProfile = {
        id: Math.random().toString(36).substr(2, 9),
        name: newUser.name,
        role: newUser.role as UserRole,
        pin: newUser.pin,
        permissions: newUser.permissions || [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY]
      };
      const updated = [...users, u];
      setUsers(updated);
      storageService.saveUsers(updated);
      setIsUserModalOpen(false);
      setNewUser({ role: 'WORKER', permissions: [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY] });
    }
  };

  const handleAddSubCat = () => {
    if (newSubCat.name && newSubCat.parentCategory) {
      const sc: SubCategory = {
        id: Math.random().toString(36).substr(2, 9),
        name: newSubCat.name,
        parentCategory: newSubCat.parentCategory
      };
      const updated = [...subCategories, sc];
      setSubCategories(updated);
      storageService.saveSubCategories(updated);
      setIsSubCatModalOpen(false);
      setNewSubCat({ parentCategory: CATEGORIES[0] });
    }
  };

  const handleDeleteSubCat = (id: string) => {
    if (confirm("Supprimer cette sous-catégorie ? Cela ne supprimera pas les produits associés.")) {
      const updated = subCategories.filter(sc => sc.id !== id);
      setSubCategories(updated);
      storageService.saveSubCategories(updated);
    }
  };

  const handleDeleteUser = (id: string) => {
    if (id === 'admin') { alert("Action impossible sur le compte gérant."); return; }
    if (confirm("Supprimer définitivement cet accès ?")) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      storageService.saveUsers(updated);
    }
  };

  if (!config) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-end">
        <Branding companyName={config.name} category={config.subDomain || 'Alimentation'} size="lg" variant="light" />
        <div className="hidden md:block">
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">nexaPME Administration v2.5</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sauvegarde & Restauration */}
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-blue-50 flex items-center space-x-3">
              <FileJson className="text-blue-500" size={24} />
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em]">Sauvegarde & Données (JSON)</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => storageService.exportAllDataAsJSON()}
                className="flex items-center justify-center space-x-3 p-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl"
              >
                <Download size={20} />
                <span>Exporter la Base (JSON)</span>
              </button>
              
              <label className="flex items-center justify-center space-x-3 p-5 bg-white text-blue-600 border-2 border-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all cursor-pointer">
                <Upload size={20} />
                <span>Restaurer une Base</span>
                <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </label>
            </div>
          </section>

          {/* Diagnostic Permissions */}
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-emerald-50 flex items-center space-x-3">
              <ShieldCheck className="text-emerald-500" size={24} />
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em]">Diagnostic Système & Permissions</h3>
            </div>
            <div className="p-8">
              <p className="text-xs text-slate-500 font-medium mb-6">
                Si vous ne parvenez pas à utiliser la caméra pour scanner ou la localisation, cliquez sur les boutons ci-dessous pour forcer la demande d'accès du navigateur.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => requestPermission('camera')} className="flex items-center justify-center space-x-3 p-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg">
                  <Camera size={18} />
                  <span>Activer Caméra</span>
                </button>
                <button onClick={() => requestPermission('mic')} className="flex items-center justify-center space-x-3 p-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg">
                  <Mic size={18} />
                  <span>Activer Micro</span>
                </button>
                <button onClick={() => requestPermission('geo')} className="flex items-center justify-center space-x-3 p-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg">
                  <Navigation size={18} />
                  <span>Localisation</span>
                </button>
              </div>
            </div>
          </section>
          
          {/* Identité & Facturation */}
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
              <Building2 className="text-emerald-500" size={24} />
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em]">Configuration Business</h3>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Nom de l'Entreprise</label>
                  <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none" value={config.name} onChange={(e) => setConfig({...config, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Numéro NIF / RCCM</label>
                  <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none" value={config.taxId || ''} placeholder="Ex: NIF 1234 / RCCM 5678" onChange={(e) => setConfig({...config, taxId: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Téléphone Pro</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={config.phone || ''} onChange={(e) => setConfig({...config, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Email Contact</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={config.email || ''} onChange={(e) => setConfig({...config, email: e.target.value})} />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveConfig} disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 hover:bg-black transition-all">
                {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={18} />}
                <span>Sauvegarder les changements</span>
              </button>
            </div>
          </section>

          {/* Section Sous-Catégories */}
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Tags className="text-amber-500" size={24} />
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em]">Sous-Catégories Produits</h3>
              </div>
              <button onClick={() => setIsSubCatModalOpen(true)} className="p-2 bg-slate-900 text-white rounded-xl hover:scale-110 transition-all flex items-center space-x-2 px-4 text-[10px] font-black uppercase">
                <Plus size={16} /> Ajouter
              </button>
            </div>
            <div className="p-8">
              {CATEGORIES.map(cat => {
                const subs = subCategories.filter(sc => sc.parentCategory === cat);
                if (subs.length === 0) return null;
                return (
                  <div key={cat} className="mb-6 last:mb-0">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center space-x-2">
                       <span>{cat}</span>
                       <div className="h-px flex-1 bg-slate-100"></div>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {subs.map(sc => (
                        <div key={sc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <span className="font-bold text-slate-700 text-sm">{sc.name}</span>
                          <button onClick={() => handleDeleteSubCat(sc.id)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {subCategories.length === 0 && (
                <div className="py-10 text-center text-slate-300 italic font-bold">
                  Aucune sous-catégorie définie.
                </div>
              )}
            </div>
          </section>

          {/* Section Personnel */}
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="text-blue-500" size={24} />
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em]">Équipe nexaPME</h3>
              </div>
              <button onClick={() => setIsUserModalOpen(true)} className="p-2 bg-slate-900 text-white rounded-xl hover:scale-110 transition-all flex items-center space-x-2 px-4 text-[10px] font-black uppercase">
                <Plus size={16} /> Ajouter
              </button>
            </div>
            <div className="p-8 space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${u.role === 'MANAGER' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{u.name}</p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.role}</span>
                    </div>
                  </div>
                  {u.id !== 'admin' && (
                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar de Sécurité */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck size={80} /></div>
             <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><ShieldCheck size={20} /></div>
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest leading-none">Code PIN Gérant</h3>
             </div>
             <button 
              onClick={() => setIsPinModalOpen(true)}
              className="w-full py-4 bg-slate-100 text-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
             >
                <KeyRound size={16} />
                <span>Modifier mon accès</span>
             </button>
          </div>
          
          <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[2.5rem] space-y-4 shadow-sm relative overflow-hidden">
            <h3 className="font-black text-rose-800 uppercase text-[10px] tracking-widest flex items-center space-x-2 relative z-10">
              <AlertCircle size={16} />
              <span>Zone de Danger</span>
            </h3>
            <p className="text-[10px] text-rose-400 font-bold uppercase leading-relaxed relative z-10">
              Réinitialisation totale du système. Cette action supprimera tout votre stock et vos ventes.
            </p>
            <button 
              onClick={onReset} 
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg"
            >
              Tout réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Modal Ajout Sous-Catégorie */}
      {isSubCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-xs">Nouvelle Sous-Catégorie</h3>
              <button onClick={() => setIsSubCatModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Catégorie Parente</label>
                  <select 
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none"
                    value={newSubCat.parentCategory}
                    onChange={(e) => setNewSubCat({...newSubCat, parentCategory: e.target.value})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Nom de la sous-catégorie</label>
                  <input type="text" placeholder="Ex: Fruits, Boissons, ..." className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none" value={newSubCat.name || ''} onChange={(e) => setNewSubCat({...newSubCat, name: e.target.value})} />
                </div>
              </div>
              <button onClick={handleAddSubCat} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                Enregistrer la sous-catégorie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout Employé */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-xs">Accès Collaborateur</h3>
              <button onClick={() => setIsUserModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Nom de l'employé</label>
                  <input type="text" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" value={newUser.name || ''} onChange={(e) => setNewUser({...newUser, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Code PIN (4 chiffres)</label>
                  <input type="password" maxLength={4} className="w-full px-5 py-3 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-xl font-black text-center tracking-[0.5em]" value={newUser.pin || ''} onChange={(e) => setNewUser({...newUser, pin: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>
              <button onClick={handleAddUser} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                Créer l'accès
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
