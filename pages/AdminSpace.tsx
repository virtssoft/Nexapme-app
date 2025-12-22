
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { PMEEntry, LicenseType } from '../types';
import { 
  Users, Key, Plus, Trash2, Search, Building2, 
  ShieldCheck, RefreshCw, X, Copy, CheckCircle2, 
  Loader2, Edit3, Calendar, User, Save, AlertTriangle
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
      alert("Erreur lors de l'enregistrement: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("ATTENTION: Supprimer cette PME effacera TOUTES ses données de la base. Confirmer ?")) {
      setIsLoading(true);
      try {
        await storageService.deletePmeRemote(id);
        await loadPmes();
      } catch (e: any) {
        alert("Erreur suppression: " + e.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto p-4 lg:p-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase">nexaPME <span className="text-emerald-500">ROOT</span></h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Administration des Licences & PME</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={loadPmes} 
            className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} />
          </button>
          <button 
            onClick={openAddModal}
            className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span>Nouvelle PME</span>
          </button>
        </div>
      </header>

      {/* Barre de Recherche */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
        <Search size={22} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Rechercher par nom, propriétaire ou clé..." 
          className="flex-1 outline-none font-bold text-slate-700 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 text-slate-300">
           <Loader2 className="animate-spin mb-4" size={64} />
           <p className="font-black uppercase text-xs tracking-widest">Connexion Serveur Central...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pmeList.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.licenseKey.toLowerCase().includes(searchTerm.toLowerCase())
          ).map(p => (
            <div key={p.idUnique} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group hover:border-emerald-200 transition-all flex flex-col">
               <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.licenseType === 'NORMAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.licenseType}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => openEditModal(p)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                            <Edit3 size={18} />
                        </button>
                        <button onClick={() => handleDelete(p.idUnique)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{p.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                        <User size={12} />
                        <span>Propriétaire : {p.owner}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group/key relative">
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Clé d'Activation</p>
                           <p className="font-mono font-black text-slate-700 tracking-wider text-sm">{p.licenseKey}</p>
                        </div>
                        <button onClick={() => copyToClipboard(p.licenseKey)} className="p-2 text-slate-300 hover:text-emerald-500 transition-all">
                            {copiedKey === p.licenseKey ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Expiration</p>
                            <p className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                                <Calendar size={12} className="text-emerald-500" />
                                {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'Illimité'}
                            </p>
                         </div>
                         <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">ID Système</p>
                            <p className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                                <ShieldCheck size={12} className="text-blue-500" />
                                {p.idUnique}
                            </p>
                         </div>
                      </div>
                  </div>
               </div>
               
               <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase">Créé le {new Date(p.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[9px] font-black text-emerald-600 uppercase">Serveur Actif</span>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajout/Edition PME */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-2xl text-slate-900 shadow-lg">
                    {editingPme ? <Edit3 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">{editingPme ? 'Modifier la PME' : 'Ajouter une PME'}</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Configuration Base de Données</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-800 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nom de l'Etablissement</label>
                  <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text" 
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500" 
                        placeholder="Ex: Alimentation Moderne"
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nom du Gérant / Propriétaire</label>
                  <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text" 
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500" 
                        placeholder="Ex: Jean Mukendi"
                        value={formData.owner || ''} 
                        onChange={(e) => setFormData({...formData, owner: e.target.value})} 
                      />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Clé de Licence</label>
                  <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text" 
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono font-black text-emerald-600 outline-none focus:border-emerald-500" 
                        value={formData.licenseKey || ''} 
                        onChange={(e) => setFormData({...formData, licenseKey: e.target.value})} 
                      />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Type de Licence</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500 appearance-none"
                    value={formData.licenseType}
                    onChange={(e) => setFormData({...formData, licenseType: e.target.value as LicenseType})}
                  >
                    <option value="TRIAL">DÉMO / TRIAL</option>
                    <option value="NORMAL">BUSINESS / PAYÉ</option>
                    <option value="UNIVERSAL">UNIVERSAL / MULTI</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Date d'Expiration</label>
                  <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="date" 
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500" 
                        value={formData.expiryDate ? new Date(formData.expiryDate).toISOString().split('T')[0] : ''} 
                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} 
                      />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={24} />
                  <p className="text-[11px] text-amber-700 font-bold leading-relaxed uppercase">
                    Les modifications apportées ici sont définitives et affectent directement l'accès de la PME au serveur. Vérifiez bien les clés avant d'enregistrer.
                  </p>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
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
