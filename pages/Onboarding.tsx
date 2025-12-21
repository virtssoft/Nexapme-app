
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { CompanyConfig, UserProfile, View } from '../types';
import { 
  ArrowRight, CheckCircle2, Lock, UserPlus, ShieldCheck, 
  ChevronLeft, Utensils, Store, X, Building2, User 
} from 'lucide-react';

interface OnboardingProps {
  onComplete: (config: CompanyConfig) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<Partial<CompanyConfig>>({ currency: 'FC' });
  const [adminPin, setAdminPin] = useState('');
  const [employees, setEmployees] = useState<Partial<UserProfile>[]>([]);
  
  const handleAddEmployee = () => {
    setEmployees([...employees, { id: Math.random().toString(36).substr(2, 9), name: '', role: 'WORKER', pin: '' }]);
  };

  const updateEmployee = (id: string, updates: Partial<UserProfile>) => {
    setEmployees(employees.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleFinish = () => {
    if (config.name && config.owner && adminPin.length === 4) {
      const finalConfig: CompanyConfig = {
        idUnique: storageService.getActiveCompanyId() || 'DEFAULT_' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        name: config.name,
        owner: config.owner,
        currency: config.currency || 'FC',
        setupDate: new Date().toISOString(),
      };
      
      const adminUser: UserProfile = {
        id: 'admin',
        name: config.owner,
        role: 'MANAGER',
        pin: adminPin,
        permissions: Object.values(View) 
      };

      const finalUsers: UserProfile[] = [
        adminUser,
        ...employees.filter(e => e.name && e.pin?.length === 4).map(e => ({
          ...e,
          permissions: [View.DASHBOARD, View.SALES, View.STOCK, View.HISTORY] 
        } as UserProfile))
      ];

      storageService.saveCompanyInfo(finalConfig);
      storageService.saveUsers(finalUsers);
      storageService.setCurrentUser(adminUser);
      onComplete(finalConfig);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-2 sm:p-4">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* Sidebar decorative - hidden on small mobile if needed, but here we stack it */}
          <div className="lg:col-span-4 bg-slate-800 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent tracking-tighter mb-4 md:mb-6">nexaPME</h1>
              <div className="p-4 md:p-5 bg-white/5 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 md:mb-3">Setup Alimentation</p>
                   <div className="flex space-x-1.5">
                      {[1,2,3].map(s => (
                        <div key={s} className={`h-1.5 md:h-2 flex-1 rounded-full ${step >= s ? 'bg-emerald-500 shadow-lg' : 'bg-white/10'}`} />
                      ))}
                   </div>
                </div>
                <div className="mt-6 md:mt-8 space-y-3">
                   <p className="text-slate-400 text-[10px] md:text-xs leading-relaxed font-medium">
                     "Gérez vos dates de péremption, vos stocks et votre caisse avec une simplicité déconcertante."
                   </p>
                </div>
            </div>
            <div className="hidden lg:block relative z-10">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Version Enterprise v2.5</p>
            </div>
          </div>

          <div className="lg:col-span-8 p-6 md:p-12 lg:p-16 flex flex-col justify-center">
             {step === 1 && (
               <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                 <header>
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Votre Alimentation</h2>
                   <p className="text-slate-500 text-sm">Configurez les informations de base de votre commerce.</p>
                 </header>
                 <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nom de l'Etablissement</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input type="text" placeholder="Ex: Alimentation La Paix" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" value={config.name || ''} onChange={(e) => setConfig({...config, name: e.target.value})} />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nom du Propriétaire</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input type="text" placeholder="Ex: Jean Mukendi" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" value={config.owner || ''} onChange={(e) => setConfig({...config, owner: e.target.value})} />
                      </div>
                   </div>
                 </div>
                 <button disabled={!config.name || !config.owner} onClick={() => setStep(2)} className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center space-x-3 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 shadow-xl">
                   <span>Suivant</span><ArrowRight size={18} />
                 </button>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                 <header>
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Sécurité Accès</h2>
                   <p className="text-slate-500 text-sm">Choisissez un code PIN pour l'accès Gérant.</p>
                 </header>
                 <div className="flex flex-col items-center">
                    <input type="password" maxLength={4} placeholder="****" className="w-full px-6 py-6 md:py-8 bg-slate-50 border-2 border-slate-100 text-slate-900 rounded-[2rem] font-black text-center text-4xl md:text-5xl tracking-[1.2em] outline-none focus:border-emerald-500" value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))} />
                 </div>
                 <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Retour</button>
                    <button disabled={adminPin.length < 4} onClick={() => setStep(3)} className="flex-[2] py-4 md:py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all">Suivant</button>
                 </div>
               </div>
             )}

             {step === 3 && (
               <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                 <header>
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Votre Équipe</h2>
                   <p className="text-slate-500 text-sm">Ajoutez vos vendeurs (facultatif).</p>
                 </header>
                 <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
                   {employees.map((emp) => (
                     <div key={emp.id} className="p-3 md:p-4 bg-slate-50 rounded-2xl flex items-center space-x-2 md:space-x-3 border border-slate-100">
                       <input type="text" placeholder="Nom Vendeur" className="flex-1 p-2 md:p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={emp.name} onChange={(e) => updateEmployee(emp.id!, { name: e.target.value })} />
                       <input type="password" maxLength={4} placeholder="PIN" className="w-16 md:w-20 p-2 md:p-3 bg-white border border-slate-200 rounded-xl text-center font-black tracking-widest text-sm" value={emp.pin} onChange={(e) => updateEmployee(emp.id!, { pin: e.target.value.replace(/\D/g, '') })} />
                       <button onClick={() => setEmployees(employees.filter(e => e.id !== emp.id))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><X size={20} /></button>
                     </div>
                   ))}
                   <button onClick={handleAddEmployee} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold uppercase text-[10px] hover:border-emerald-400 hover:text-emerald-500 transition-all">Ajouter un Vendeur</button>
                 </div>
                 <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button onClick={() => setStep(2)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest">Retour</button>
                    <button onClick={handleFinish} className="flex-[2] py-4 md:py-5 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center space-x-3 shadow-xl hover:bg-emerald-500 transition-all">
                      <span>Lancer NexaPME</span><CheckCircle2 size={18} />
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
