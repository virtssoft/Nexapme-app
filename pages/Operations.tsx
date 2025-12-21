
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { Operation, ModuleDomain } from '../types';
import { 
  Plus, Search, Clock, CheckCircle2, AlertCircle, Briefcase, Wrench, 
  Smartphone, HardHat, Camera, X, Tag, User, MapPin, ChevronRight, Truck
} from 'lucide-react';

const Operations: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const domain = config?.domain || 'TECH_SERVICES';
  
  const [ops, setOps] = useState<Operation[]>(storageService.getOperations());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Operation>>({ status: 'PENDING', metadata: {} });

  const getModuleConfig = (d: ModuleDomain) => {
    switch(d) {
      case 'TECH_SERVICES': return { title: 'Suivi Réparations', icon: Smartphone, itemLabel: 'Appareil / Problème', statusLabel: 'Diagnostic' };
      case 'REAL_ESTATE': return { title: 'Gestion de Chantier', icon: HardHat, itemLabel: 'Nom du Projet', statusLabel: 'Étape' };
      case 'MEDIA': return { title: 'Travaux Labo', icon: Camera, itemLabel: 'Projet Photo/Vidéo', statusLabel: 'Production' };
      case 'LOGISTICS': return { title: 'Missions Livraisons', icon: Truck, itemLabel: 'Destination / Colis', statusLabel: 'Transit' };
      default: return { title: 'Opérations', icon: Briefcase, itemLabel: 'Titre de la mission', statusLabel: 'État' };
    }
  };

  const moduleInfo = getModuleConfig(domain);

  const handleSave = () => {
    if (!formData.title || !formData.clientName) return;
    const newOp: Operation = {
      id: `OP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      clientName: formData.clientName,
      title: formData.title,
      description: formData.description || '',
      status: 'PENDING',
      startDate: new Date().toISOString(),
      estimatedCost: Number(formData.estimatedCost) || 0,
      domain: domain,
      metadata: formData.metadata
    };
    const updated = [newOp, ...ops];
    setOps(updated);
    storageService.saveOperations(updated);
    setIsModalOpen(false);
  };

  const getStatusColor = (status: Operation['status']) => {
    switch(status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase flex items-center space-x-3">
            <moduleInfo.icon size={32} className="text-blue-500" />
            <span>{moduleInfo.title}</span>
          </h2>
          <p className="text-slate-500 font-medium">Gestion opérationnelle {config?.name}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center space-x-2">
          <Plus size={20} />
          <span>Nouvelle Fiche</span>
        </button>
      </header>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-3">
        <Search size={20} className="text-slate-400" />
        <input type="text" placeholder="Rechercher par client ou dossier..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ops.filter(o => o.title.toLowerCase().includes(searchTerm.toLowerCase())).map(op => (
          <div key={op.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                <moduleInfo.icon size={24} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(op.status)}`}>
                {op.status}
              </span>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-black text-slate-800 uppercase text-sm leading-tight">{op.title}</h3>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold uppercase">
                <User size={12} /> <span>{op.clientName}</span>
              </div>
              {domain === 'TECH_SERVICES' && op.metadata?.deviceSerial && (
                <div className="flex items-center space-x-2 text-[10px] text-blue-500 font-black uppercase">
                  <Tag size={12} /> <span>SN: {op.metadata.deviceSerial}</span>
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-slate-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase mb-1">Budget Est.</p>
                <p className="text-lg font-black text-slate-900">{op.estimatedCost.toLocaleString()} FC</p>
              </div>
              <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest">Nouveau Dossier - {moduleInfo.title}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Client / Donneur d'ordre</label>
                  <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold" value={formData.clientName || ''} onChange={(e) => setFormData({...formData, clientName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">{moduleInfo.itemLabel}</label>
                  <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                </div>
                
                {domain === 'TECH_SERVICES' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase">N° de Série / IMEI de l'appareil</label>
                    <input type="text" className="w-full p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 font-bold" value={formData.metadata?.deviceSerial || ''} onChange={(e) => setFormData({...formData, metadata: {...formData.metadata, deviceSerial: e.target.value}})} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Coût estimé (Optionnel)</label>
                    <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold" value={formData.estimatedCost || 0} onChange={(e) => setFormData({...formData, estimatedCost: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Échéance prévue</label>
                    <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold" value={formData.endDate || ''} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                  </div>
                </div>
              </div>

              <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                Ouvrir la fiche de suivi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operations;
