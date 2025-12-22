
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { PMEEntry, LicenseType } from '../types';
import { 
  Plus, Trash2, Search, 
  RefreshCw, X, Copy, CheckCircle2, 
  Loader2, Edit3, Save, CloudOff
} from 'lucide-react';

const AdminSpace: React.FC = () => {
  const [pmeList, setPmeList] = useState<PMEEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPme, setEditingPme] = useState<PMEEntry | null>(null);
  const [formData, setFormData] = useState<Partial<PMEEntry>>({
    licenseType: 'TRIAL'
  });

  useEffect(() => {
    loadPmes();
  }, []);

  const loadPmes = async () => {
    setIsLoading(true);
    const data = await storageService.getPmeListRemote();
    setPmeList(data);
    setIsLoading(false);
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openAddModal = () => {
    setEditingPme(null);
    setFormData({ 
        licenseType: 'TRIAL', 
        licenseKey: 'NEXA-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (pme: PMEEntry) => {
    setEditingPme(pme);
    setFormData(pme);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.owner) {
      alert("Veuillez remplir les champs obligatoires.");
      return;
    }

    setIsLoading(true);
    try {
      if (editingPme) {
        await storageService.updatePmeRemote(editingPme.idUnique, formData);
      } else {
        await storageService.createPmeRemote(formData);
      }
      await loadPmes();
      setIsModalOpen(false);
    } catch (e: any) {
      alert("Note : Enregistré localement.");
      await loadPmes();
      setIsModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Confirmer la suppression ?")) {
      setIsLoading(true);
      await storageService.deletePmeRemote(id);
      await loadPmes();
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto p-3 md:p-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">nexaPME <span className="text-emerald-500 text-2xl md:text-4xl">ROOT</span></h1>
          <p className="text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.3em] mt-2">Administration des Licences</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={loadPmes} 
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} />
          </button>
          <button 
            onClick={openAddModal}
            className="flex-1 md:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span>Nouveau</span>
          </button>
        </div>
      </header>

      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
        <Search size={20} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Rechercher..." 
          className="flex-1 outline-none font-bold text-sm text-slate-700 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading && pmeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
           <Loader2 className="animate-spin mb-4" size={48} />
           <p className="font-black uppercase text-[10px] tracking-widest">Initialisation...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {pmeList.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.owner.toLowerCase().includes(searchTerm.toLowerCase())
          ).map(p => (
            <div key={p.idUnique} className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group flex flex-col">
               <div className="p-6 md:p-8 space-y-4 md:space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.licenseType === 'NORMAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.licenseType}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => openEditModal(p)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                            <Edit3 size={18} />
                        </button>
                        <button onClick={() => handleDelete(p.idUnique)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter leading-none truncate">{p.name}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase truncate">Gérant : {p.owner}</p>
                  </div>

                  <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <p className="font-mono font-black text-slate-700 text-xs truncate mr-2">{p.licenseKey}</p>
                        <button onClick={() => copyToClipboard(p.licenseKey)} className="p-1.5 text-slate-300 hover:text-emerald-500">
                            {copiedKey === p.licenseKey ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                         <div className="p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                            <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Expiration</p>
                            <p className="text-[9px] font-black text-slate-800 truncate">
                                {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'ILLIMITÉ'}
                            </p>
                         </div>
                         <div className="p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                            <p className="text-[7px] font-black text-slate-400 uppercase mb-1">ID SYSTÈME</p>
                            <p className="text-[9px] font-black text-slate-800 truncate">{p.idUnique}</p>
                         </div>
                      </div>
                  </div>
               </div>
               
               <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Depuis {new Date(p.createdAt || Date.now()).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                      {p.idUnique.startsWith('LOCAL-') ? (
                          <div className="flex items-center gap-1 text-amber-500">
                              <CloudOff size={10} />
                              <span className="text-[8px] font-black uppercase">Local</span>
                          </div>
                      ) : (
                          <div className="flex items-center gap-1 text-emerald-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <span className="text-[8px] font-black uppercase">Cloud</span>
                          </div>
                      )}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajout/Edition PME */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-3">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <h3 className="text-sm font-black uppercase tracking-widest">{editingPme ? 'Modifier' : 'Nouvelle PME'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 md:p-8 space-y-6 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Etablissement</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Propriétaire</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500" 
                    value={formData.owner || ''} 
                    onChange={(e) => setFormData({...formData, owner: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Clé Licence</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-mono font-black text-emerald-600 text-sm outline-none" 
                    value={formData.licenseKey || ''} 
                    onChange={(e) => setFormData({...formData, licenseKey: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none"
                    value={formData.licenseType}
                    onChange={(e) => setFormData({...formData, licenseType: e.target.value as LicenseType})}
                  >
                    <option value="TRIAL">DÉMO / TRIAL</option>
                    <option value="NORMAL">BUSINESS</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiration</label>
                  <input 
                    type="date" 
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none" 
                    value={formData.expiryDate ? new Date(formData.expiryDate).toISOString().split('T')[0] : ''} 
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} 
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={isLoading}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                <span>Enregistrer la Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSpace;
