
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { Appointment } from '../types';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  User, 
  Scissors, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Appointments: React.FC = () => {
  const [apps, setApps] = useState<Appointment[]>(storageService.getAppointments());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Appointment>>({ status: 'SCHEDULED' });

  const handleSave = () => {
    const newApp: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      clientName: formData.clientName || '',
      serviceName: formData.serviceName || '',
      dateTime: formData.dateTime || new Date().toISOString(),
      duration: Number(formData.duration) || 30,
      status: 'SCHEDULED'
    };
    const updated = [newApp, ...apps];
    setApps(updated);
    storageService.saveAppointments(updated);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center space-x-3">
            <Scissors size={28} className="text-emerald-500" />
            <span>Planning & RDV</span>
          </h2>
          <p className="text-slate-500 font-medium">Gestion des réservations clients</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-xl"
        >
          <Plus size={20} />
          <span className="font-black text-xs uppercase tracking-widest">Réserver</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar View (Simplified) */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Aujourd'hui</h3>
              <div className="flex space-x-2">
                 <button className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"><ChevronLeft size={18} /></button>
                 <button className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"><ChevronRight size={18} /></button>
              </div>
           </div>
           
           <div className="space-y-4">
              {apps.sort((a,b) => a.dateTime.localeCompare(b.dateTime)).map(app => (
                <div key={app.id} className="group flex items-center space-x-6 p-5 rounded-3xl bg-slate-50 hover:bg-white border-2 border-transparent hover:border-emerald-200 transition-all">
                   <div className="flex flex-col items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:bg-emerald-50 transition-all">
                      <span className="text-xs font-black text-slate-400 group-hover:text-emerald-600 leading-none mb-1 uppercase">Heure</span>
                      <span className="text-lg font-black text-slate-800">{new Date(app.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                   <div className="flex-1">
                      <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">{app.clientName}</h4>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 font-bold uppercase mt-1">
                         <span className="flex items-center space-x-1"><Scissors size={12} /> <span>{app.serviceName}</span></span>
                         <span className="flex items-center space-x-1"><Clock size={12} /> <span>{app.duration} min</span></span>
                      </div>
                   </div>
                   <div className="flex space-x-2">
                      <button className="p-3 bg-white text-emerald-500 rounded-xl border border-slate-100 hover:bg-emerald-50 transition-all shadow-sm"><CheckCircle2 size={18} /></button>
                      <button className="p-3 bg-white text-rose-500 rounded-xl border border-slate-100 hover:bg-rose-50 transition-all shadow-sm"><XCircle size={18} /></button>
                   </div>
                </div>
              ))}
              {apps.length === 0 && (
                <div className="py-20 text-center text-slate-300 italic font-bold">Aucun rendez-vous planifié.</div>
              )}
           </div>
        </div>

        {/* Sidebar Stats */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="relative z-10 space-y-4">
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Occupation Journée</p>
                 <h2 className="text-5xl font-black">{apps.length} <span className="text-lg text-slate-400">RDV</span></h2>
                 <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(apps.length / 10) * 100}%` }}></div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase tracking-widest">Nouveau Rendez-vous</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 text-2xl">&times;</button>
             </div>
             <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Client</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold" value={formData.clientName || ''} onChange={(e) => setFormData({...formData, clientName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Service</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold" value={formData.serviceName || ''} onChange={(e) => setFormData({...formData, serviceName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Date & Heure</label>
                      <input type="datetime-local" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-xs" value={formData.dateTime || ''} onChange={(e) => setFormData({...formData, dateTime: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Durée (min)</label>
                      <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold" value={formData.duration || 30} onChange={(e) => setFormData({...formData, duration: Number(e.target.value)})} />
                   </div>
                </div>
             </div>
             <div className="p-8 bg-slate-50 flex space-x-3 border-t border-slate-200 rounded-b-[2.5rem]">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-widest">Annuler</button>
                <button onClick={handleSave} className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">Confirmer RDV</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
