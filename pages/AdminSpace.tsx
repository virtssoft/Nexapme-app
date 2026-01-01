
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { ApiService } from '../services/ApiService';
import { PMEEntry, LicenseType, View } from '../types';
import { 
  Plus, Trash2, Search, 
  RefreshCw, X, Copy, CheckCircle2, 
  Loader2, Edit3, Save, CloudOff, Cloud, Database,
  AlertCircle, ShieldAlert, ShieldCheck, Building2, Phone, Mail, MapPin, Landmark, User, Lock, LayoutGrid,
  // Added missing KeyRound icon
  KeyRound
} from 'lucide-react';

const AdminSpace: React.FC = () => {
  const [pmeList, setPmeList] = useState<PMEEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'LICENSE' | 'COMPANY' | 'OWNER'>('LICENSE');
  const [editingPme, setEditingPme] = useState<PMEEntry | null>(null);
  
  // Extended Form Data
  const [formData, setFormData] = useState<any>({
    license_type: 'TRIAL',
    status: 'ACTIVE',
    currency: 'FC',
    owner_pin: ''
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

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openAddModal = () => {
    setEditingPme(null);
    setModalTab('LICENSE');
    setFormData({ 
        id: 'PME-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        license_type: 'TRIAL', 
        status: 'ACTIVE',
        currency: 'FC',
        license_key: 'NEXA-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        owner_pin: '1234'
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.owner_name || !formData.owner_pin) {
      alert("Erreur: Le nom PME, le nom du gérant et son code PIN sont obligatoires.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Création/Mise à jour de la PME
      if (editingPme) {
        await ApiService.updateAdminPme(formData);
      } else {
        await ApiService.createAdminPme(formData);
        
        // 2. Création automatique du compte PROPRIÉTAIRE (Seulement pour nouvelle PME)
        const ownerPayload = {
          id: 'USR-PROPRIO-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
          pme_id: formData.id,
          name: formData.owner_name,
          role: 'MANAGER',
          pin_hash: formData.owner_pin,
          permissions: JSON.stringify(Object.values(View))
        };
        await ApiService.createUser(ownerPayload);
      }
      
      await loadPmes();
      setIsModalOpen(false);
      alert(editingPme ? "PME mise à jour." : "Licence et compte propriétaire créés avec succès !");
    } catch (e: any) {
      alert("Échec de l'opération : " + (e.message || "Erreur inconnue"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Confirmer la suppression ? Cette action supprimera la licence et l'accès de l'entreprise.")) {
      setIsLoading(true);
      try {
        await ApiService.deleteAdminPme(id);
        await loadPmes();
      } catch (e: any) {
        alert("Erreur lors de la suppression : " + e.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto p-3 md:p-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">nexaPME <span className="text-emerald-500 text-2xl md:text-4xl">ROOT</span></h1>
          <div className="flex items-center space-x-3">
            <p className="text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.3em]">Console de Gestion des Partenaires</p>
            <div className={`px-2 py-0.5 rounded-full flex items-center space-x-2 border ${serverOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <div className={`w-1 h-1 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
              <span className="text-[7px] font-black uppercase tracking-widest">{serverOnline ? 'Cloud Synced' : 'Sync Error'}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={openAddModal}
          className="px-8 py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.1em] shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
        >
          <Plus size={20} />
          <span>Émettre une nouvelle clé</span>
        </button>
      </header>

      {/* Liste des licences... (filtrage et mapping inchangés mais avec UI plus dense) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pmeList.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:border-emerald-500 transition-all hover:shadow-xl">
               <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.license_type === 'NORMAL' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.license_type}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">{p.name}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Propriétaire: {p.owner_name}</p>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-2xl flex items-center justify-between border border-slate-800">
                    <p className="font-mono font-black text-emerald-400 text-xs tracking-widest">{p.license_key}</p>
                    <button onClick={() => copyToClipboard(p.license_key)} className="text-slate-500 hover:text-white">
                        {copiedKey === p.license_key ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
               </div>
               <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <span className={`text-[8px] font-black uppercase tracking-widest ${p.status === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'}`}>{p.status}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Exp: {p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : 'ILLIMITÉ'}</span>
               </div>
            </div>
          ))}
      </div>

      {/* Modal Root Config */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center space-x-4">
                  <div className="p-3 bg-emerald-500 rounded-2xl text-slate-900 shadow-lg">
                    {/* // Fixed: used imported KeyRound component */}
                    <KeyRound size={24} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Configuration Root Licence</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-all"><X size={24} /></button>
            </div>

            {/* Navigation du Modal */}
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex space-x-1 shrink-0">
               {[
                 { id: 'LICENSE', label: 'Licence', icon: ShieldCheck },
                 { id: 'COMPANY', label: 'Entreprise', icon: Building2 },
                 { id: 'OWNER', label: 'Propriétaire', icon: User }
               ].map(tab => (
                 <button 
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as any)}
                  className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all ${modalTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}
                 >
                   <tab.icon size={14} />
                   <span className="hidden sm:inline">{tab.label}</span>
                 </button>
               ))}
            </div>

            <div className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
              {modalTab === 'LICENSE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Clé Licence</label>
                    <div className="relative">
                      <input type="text" className="w-full px-5 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-mono font-black text-emerald-600 text-base outline-none" value={formData.license_key || ''} onChange={(e) => setFormData({...formData, license_key: e.target.value})} />
                      <button onClick={() => setFormData({...formData, license_key: 'NEXA-' + Math.random().toString(36).substr(2, 8).toUpperCase()})} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600"><RefreshCw size={18} /></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de Licence</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none" value={formData.license_type} onChange={(e) => setFormData({...formData, license_type: e.target.value})}>
                      <option value="TRIAL">DÉMO (7 JOURS)</option>
                      <option value="NORMAL">STANDARD</option>
                      <option value="UNIVERSAL">UNLIMITED PREMIUM</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date d'Expiration</label>
                    <input type="date" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none" value={formData.expiry_date || ''} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} />
                  </div>
                </div>
              )}

              {modalTab === 'COMPANY' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom commercial PME</label>
                    <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 uppercase" placeholder="Ex: ETS NADSTORE" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"><Phone size={10} className="inline mr-1" /> Téléphone</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none" placeholder="+243..." value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"><MapPin size={10} className="inline mr-1" /> Adresse</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none" placeholder="Kinshasa, Gombe..." value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"><Landmark size={10} className="inline mr-1" /> Détails Bancaires (Mobile / Bank)</label>
                    <textarea className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none" placeholder="M-Pesa: 0812345678" rows={2} value={formData.bankDetails || ''} onChange={(e) => setFormData({...formData, bankDetails: e.target.value})} />
                  </div>
                </div>
              )}

              {modalTab === 'OWNER' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl flex items-center space-x-4">
                     <AlertCircle className="text-blue-500" size={24} />
                     <p className="text-[10px] font-bold text-blue-700 uppercase">Un compte Gérant sera créé avec ces accès pour cette PME.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom complet du Gérant</label>
                    <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none" value={formData.owner_name || ''} onChange={(e) => setFormData({...formData, owner_name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Code PIN Secret (4 chiffres)</label>
                    <input type="password" maxLength={4} className="w-full px-5 py-6 bg-slate-900 border-2 border-slate-800 rounded-[2rem] font-black text-center text-emerald-500 text-4xl tracking-[0.5em] outline-none" value={formData.owner_pin || ''} onChange={(e) => setFormData({...formData, owner_pin: e.target.value.replace(/\D/g, '')})} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuler</button>
               <button onClick={handleSave} disabled={isLoading} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center space-x-3">
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                  <span>{editingPme ? 'Mettre à jour Root' : 'Activer Root Licence'}</span>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSpace;
