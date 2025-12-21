
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { PMEEntry, LicenseType } from '../types';
import { 
  Users, Key, Plus, Trash2, Search, Building2, Calendar, 
  ShieldCheck, ArrowRight, RefreshCw, X, Copy, CheckCircle2, Clock, Sparkles
} from 'lucide-react';
import Branding from '../components/Branding';

type LicenseDuration = '6_MONTHS' | '1_YEAR' | '2_YEARS';

const AdminSpace: React.FC = () => {
  const [pmeList, setPmeList] = useState<PMEEntry[]>(storageService.getPMEList());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PMEEntry>>({ licenseType: 'NORMAL' });
  const [duration, setDuration] = useState<LicenseDuration>('1_YEAR');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const generateKey = (type: LicenseType) => {
    const prefix = type === 'UNIVERSAL' ? 'UX' : 'NX';
    const rand = Math.random().toString(36).substr(2, 10).toUpperCase();
    return `${prefix}-${rand}`;
  };

  const calculateExpiry = (dur: LicenseDuration) => {
    const now = new Date();
    if (dur === '6_MONTHS') now.setMonth(now.getMonth() + 6);
    else if (dur === '1_YEAR') now.setFullYear(now.getFullYear() + 1);
    else if (dur === '2_YEARS') now.setFullYear(now.getFullYear() + 2);
    return now.toISOString();
  };

  const handleCreate = () => {
    if (!formData.name || !formData.owner) return;
    
    const idUnique = Math.random().toString(36).substr(2, 6).toUpperCase();
    const licenseKey = generateKey(formData.licenseType as LicenseType);
    
    const expiryDate = formData.licenseType === 'NORMAL' 
      ? calculateExpiry(duration)
      : undefined;

    const newPME: PMEEntry = {
      idUnique,
      name: formData.name,
      owner: formData.owner,
      licenseKey,
      licenseType: formData.licenseType as LicenseType,
      expiryDate,
      createdAt: new Date().toISOString()
    };

    const updated = [...pmeList, newPME];
    setPmeList(updated);
    storageService.savePMEList(updated);
    setIsModalOpen(false);
    setFormData({ licenseType: 'NORMAL' });
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer cette PME ? Toutes ses données seront inaccessibles.")) {
      const updated = pmeList.filter(p => p.idUnique !== id);
      setPmeList(updated);
      storageService.savePMEList(updated);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto p-4 lg:p-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">nexaPME <span className="text-emerald-500">ADMIN</span></h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-1">Centre de Contrôle Global</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center space-x-2 hover:bg-emerald-500 transition-all"
        >
          <Plus size={20} />
          <span>Nouvelle PME Client</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Users size={24} /></div>
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Clients</p>
             <p className="text-2xl font-black text-slate-900">{pmeList.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ShieldCheck size={24} /></div>
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Keys</p>
             <p className="text-2xl font-black text-slate-900">2 Actives</p>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl flex items-center space-x-4">
          <div className="p-4 bg-white/10 text-emerald-400 rounded-2xl"><RefreshCw size={24} /></div>
          <div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Build v2025.2</p>
             <p className="text-2xl font-black">Stable</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-3">
        <Search size={20} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Rechercher par nom d'entreprise ou propriétaire..." 
          className="flex-1 outline-none font-bold text-sm bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pmeList.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.owner.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
          <div key={p.idUnique} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:border-emerald-200 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase tracking-[0.2em] 
              ${p.licenseType === 'UNIVERSAL' ? 'bg-amber-500 text-white' : 
                p.licenseType === 'TRIAL' ? 'bg-slate-400 text-white' : 'bg-blue-600 text-white'}`}>
              Licence {p.licenseType}
            </div>

            <div className="flex justify-between items-start mb-6">
               <div className="flex items-center space-x-4">
                  <div className={`p-4 rounded-3xl group-hover:bg-slate-900 group-hover:text-white transition-all 
                    ${p.licenseType === 'TRIAL' ? 'bg-slate-50 text-slate-300' : 'bg-slate-50 text-slate-400'}`}>
                    {p.licenseType === 'TRIAL' ? <Sparkles size={24} /> : <Building2 size={24} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{p.name}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">Gérant: {p.owner}</p>
                  </div>
               </div>
               <button onClick={() => handleDelete(p.idUnique)} className="p-2 text-rose-200 hover:text-rose-600 transition-colors">
                  <Trash2 size={20} />
               </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Licence Key</p>
                  <p className="font-mono font-black text-slate-800 tracking-wider text-sm">{p.licenseKey}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(p.licenseKey)}
                  className="p-3 bg-white text-slate-400 rounded-xl border border-slate-100 hover:text-emerald-500 transition-all"
                >
                  {copiedKey === p.licenseKey ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-2">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Clock size={12} />
                  <span>Expire: {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'Illimitée'}</span>
                </div>
                <div className="text-emerald-500">ID: {p.idUnique}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center rounded-t-[2.5rem]">
              <h3 className="text-sm font-black uppercase tracking-widest">Enregistrement Nouveau Client</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Nom de l'Etablissement</label>
                  <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-emerald-500" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Propriétaire / Responsable</label>
                  <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-emerald-500" value={formData.owner || ''} onChange={(e) => setFormData({...formData, owner: e.target.value})} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Type de Licence</label>
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button 
                      onClick={() => setFormData({...formData, licenseType: 'NORMAL'})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.licenseType === 'NORMAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      Périodique
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, licenseType: 'UNIVERSAL'})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.licenseType === 'UNIVERSAL' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      Illimitée
                    </button>
                  </div>
                </div>

                {formData.licenseType === 'NORMAL' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2">Durée de Validité</label>
                    <div className="grid grid-cols-3 gap-2">
                       <button onClick={() => setDuration('6_MONTHS')} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${duration === '6_MONTHS' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-50'}`}>6 Mois</button>
                       <button onClick={() => setDuration('1_YEAR')} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${duration === '1_YEAR' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-50'}`}>1 An</button>
                       <button onClick={() => setDuration('2_YEARS')} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${duration === '2_YEARS' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-50'}`}>2 Ans</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleCreate} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2 hover:bg-emerald-500 transition-all">
                <span>Générer et Enregistrer</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSpace;
