
import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';
import { PMEEntry, View } from '../types';
import { 
  Plus, Trash2, Search, 
  RefreshCw, X, Copy, CheckCircle2, 
  Loader2, Edit3, Save, 
  ShieldCheck, Building2, Phone, MapPin, Landmark, User, KeyRound,
  Calendar, Award, Zap, Crown
} from 'lucide-react';

const AdminSpace: React.FC = () => {
  const [pmeList, setPmeList] = useState<PMEEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPme, setEditingPme] = useState<PMEEntry | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    owner_name: '',
    license_key: '',
    license_type: 'NORMAL' as 'NORMAL' | 'UNIVERSAL' | 'ADMIN',
    expiry_months: '12' as '6' | '12' | '24',
    status: 'ACTIVE'
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

  const calculateExpiry = (months: string) => {
    const date = new Date();
    date.setMonth(date.getMonth() + parseInt(months));
    return date.toISOString().split('T')[0];
  };

  const generateLicenseKey = () => {
    return 'NEXA-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  };

  const openAddModal = () => {
    setEditingPme(null);
    const newId = 'PME-' + Math.floor(1000 + Math.random() * 9000);
    setFormData({
      id: newId,
      name: '',
      owner_name: '',
      license_key: generateLicenseKey(),
      license_type: 'NORMAL',
      expiry_months: '12',
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.owner_name || !formData.license_key) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        id: formData.id,
        name: formData.name,
        owner_name: formData.owner_name,
        license_key: formData.license_key,
        license_type: formData.license_type,
        expiry_date: formData.license_type === 'NORMAL' ? calculateExpiry(formData.expiry_months) : '2099-12-31',
        status: formData.status
      };

      if (editingPme) {
        await ApiService.updateAdminPme(payload);
      } else {
        await ApiService.createAdminPme(payload);
      }
      
      await loadPmes();
      setIsModalOpen(false);
      alert(editingPme ? "PME mise à jour !" : "PME créée avec succès !");
    } catch (e: any) {
      alert("Erreur : " + (e.message || "Impossible de contacter le serveur."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer cette PME ? L'accès sera immédiatement révoqué.")) {
      setIsLoading(true);
      try {
        await ApiService.deleteAdminPme(id);
        await loadPmes();
      } catch (e: any) {
        alert("Erreur : " + e.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen space-y-8 pb-24 max-w-7xl mx-auto px-4 md:px-8 py-6 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl shadow-2xl">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                nexa<span className="text-emerald-500">ROOT</span>
              </h1>
              <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.4em] mt-1">Infrastructure Control Center</p>
            </div>
          </div>
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${serverOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            <span>{serverOnline ? 'Cloud Synced' : 'Sync Offline'}</span>
          </div>
        </div>

        <button 
          onClick={openAddModal}
          className="group relative overflow-hidden px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all duration-300 flex items-center justify-center gap-4 w-full lg:w-auto"
        >
          <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Émettre Licence</span>
        </button>
      </header>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-500 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Partenaires</p>
            <h3 className="text-3xl font-black text-slate-900">{pmeList.length}</h3>
          </div>
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">
            <Building2 size={24} />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-500 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Licences Actives</p>
            <h3 className="text-3xl font-black text-slate-900">{pmeList.filter(p => p.status === 'ACTIVE').length}</h3>
          </div>
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
            <Award size={24} />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-500 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En attente / Démo</p>
            <h3 className="text-3xl font-black text-slate-900">{pmeList.filter(p => p.license_type === 'TRIAL').length}</h3>
          </div>
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl group-hover:bg-amber-50 group-hover:text-amber-500 transition-all">
            <Zap size={24} />
          </div>
        </div>
      </div>

      {/* Search & List */}
      <div className="space-y-6">
        <div className="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 text-slate-300"><Search size={24} /></div>
          <input 
            type="text" 
            placeholder="Rechercher par PME, Propriétaire ou Clé..." 
            className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-700 placeholder:text-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading && pmeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin text-emerald-500" size={48} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialisation Cloud Root...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pmeList.filter(p => 
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              p.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.license_key.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(p => (
              <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:border-emerald-500 transition-all duration-300 hover:shadow-2xl group">
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] ${
                      p.license_type === 'ADMIN' ? 'bg-slate-900 text-emerald-400' :
                      p.license_type === 'UNIVERSAL' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {p.license_type}
                    </span>
                    <div className="flex space-x-1">
                      <button onClick={() => { setEditingPme(p); setFormData({...p, expiry_months: '12'}); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"><Edit3 size={18} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.id}</p>
                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">{p.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center space-x-2 mt-2">
                      <User size={12} className="text-slate-300" />
                      <span className="uppercase">{p.owner_name}</span>
                    </p>
                  </div>

                  <div className="p-5 bg-slate-900 rounded-[1.8rem] flex items-center justify-between border border-white/5 shadow-inner">
                    <p className="font-mono font-black text-emerald-400 text-[11px] tracking-widest truncate mr-4">{p.license_key}</p>
                    <button onClick={() => copyToClipboard(p.license_key)} className="text-slate-500 hover:text-white transition-colors shrink-0">
                      {copiedKey === p.license_key ? <CheckCircle2 size={20} className="text-emerald-400" /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${p.status === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'}`}>{p.status}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Calendar size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : 'ILLIMITÉ'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modern Responsive Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-0 md:p-6 lg:p-12 overflow-y-auto no-scrollbar">
          <div className="bg-white w-full max-w-2xl min-h-screen md:min-h-0 rounded-none md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            
            <div className="p-8 md:p-10 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-5">
                <div className="p-4 bg-emerald-500 rounded-3xl text-slate-900 shadow-2xl">
                  <KeyRound size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">{editingPme ? 'Mise à jour PME' : 'Émission Nouvelle Licence'}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">NexaRoot Protocol v2.5</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 hover:bg-rose-500 rounded-2xl transition-all"><X size={28} /></button>
            </div>

            <div className="p-8 md:p-12 space-y-10 flex-1 overflow-y-auto no-scrollbar">
              
              {/* Identité Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="h-4 w-1 bg-emerald-500 rounded-full"></div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Identité & Entité</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">ID PME (Généré)</label>
                    <input 
                      type="text" 
                      readOnly 
                      className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-100 rounded-2xl font-black text-slate-500 outline-none" 
                      value={formData.id} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Nom de la PME *</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all" 
                      placeholder="Ex: ETS NADSTORE"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="col-span-full space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Nom complet du Gérant / Propriétaire *</label>
                    <div className="relative">
                      <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="text" 
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all" 
                        placeholder="Ex: Jean-Marc Mukendi"
                        value={formData.owner_name}
                        onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Licence Configuration */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="h-4 w-1 bg-amber-500 rounded-full"></div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Paramètres de Licence</h4>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Clé de Licence nexaPME</label>
                    <div className="relative">
                      <KeyRound size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" />
                      <input 
                        type="text" 
                        readOnly={!!editingPme}
                        className={`w-full pl-14 pr-16 py-5 rounded-[1.8rem] font-mono font-black text-lg outline-none transition-all ${
                          editingPme ? 'bg-slate-100 text-slate-500 border-2 border-slate-100' : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-100 focus:border-emerald-500'
                        }`}
                        value={formData.license_key}
                        onChange={(e) => setFormData({...formData, license_key: e.target.value})}
                      />
                      {!editingPme && (
                        <button 
                          onClick={() => setFormData({...formData, license_key: generateLicenseKey()})}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-600 hover:rotate-180 transition-transform duration-500"
                        >
                          <RefreshCw size={22} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Type de Partenariat</label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'NORMAL', icon: Zap, label: 'Standard (Payant)', desc: 'Limité dans le temps' },
                          { id: 'UNIVERSAL', icon: Crown, label: 'Universal (Premium)', desc: 'Pas d\'expiration' },
                          { id: 'ADMIN', icon: ShieldCheck, label: 'Nexaroot Admin', desc: 'Contrôle Total' }
                        ].map(type => (
                          <button 
                            key={type.id}
                            onClick={() => setFormData({...formData, license_type: type.id as any})}
                            className={`p-4 rounded-2xl border-2 text-left flex items-center space-x-4 transition-all ${
                              formData.license_type === type.id ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                            }`}
                          >
                            <type.icon size={20} className={formData.license_type === type.id ? 'text-emerald-500' : 'text-slate-300'} />
                            <div>
                              <p className={`text-[11px] font-black uppercase ${formData.license_type === type.id ? 'text-emerald-700' : 'text-slate-600'}`}>{type.label}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">{type.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Durée de validité (Licence Normale)</label>
                      <div className={`p-6 rounded-[2rem] border-2 transition-all ${formData.license_type === 'NORMAL' ? 'bg-slate-50 border-emerald-500 shadow-xl' : 'bg-slate-100 border-transparent opacity-40 pointer-events-none'}`}>
                        <div className="flex flex-col space-y-4">
                          {[
                            { val: '6', label: '6 Mois' },
                            { val: '12', label: '12 Mois' },
                            { val: '24', label: '24 Mois' }
                          ].map(choice => (
                            <button 
                              key={choice.val}
                              onClick={() => setFormData({...formData, expiry_months: choice.val as any})}
                              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                formData.expiry_months === choice.val ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm' : 'bg-transparent border-transparent text-slate-400'
                              }`}
                            >
                              <span className="text-xs font-black uppercase">{choice.label}</span>
                              {formData.expiry_months === choice.val && <CheckCircle2 size={16} />}
                            </button>
                          ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                          <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Expiration prévue le</p>
                          <p className="text-sm font-black text-emerald-600">{calculateExpiry(formData.expiry_months)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-4 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="order-2 md:order-1 flex-1 py-5 rounded-3xl border-2 border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white hover:text-rose-500 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleSave} 
                disabled={isLoading}
                className="order-1 md:order-2 flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                <span>{editingPme ? 'Mettre à jour root' : 'Activer la Licence PME'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSpace;
