
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { CompanyConfig, UserProfile, View, LicenseInfo } from '../types';
import { 
  ArrowRight, CheckCircle2, Lock, Sparkles, Building2, User, 
  ChevronLeft, X, Copy, CheckCircle, Loader2
} from 'lucide-react';

interface OnboardingProps {
  onComplete: (config: CompanyConfig) => void;
  onBackToLauncher: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onBackToLauncher }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [config, setConfig] = useState<Partial<CompanyConfig>>({ currency: 'FC' });
  const [adminPin, setAdminPin] = useState('');
  const [employees, setEmployees] = useState<Partial<UserProfile>[]>([]);
  
  // Clé générée pour le mode Essai
  const [generatedKey] = useState('TRIAL-' + Math.random().toString(36).substr(2, 8).toUpperCase());

  const handleAddEmployee = () => {
    setEmployees([...employees, { id: Math.random().toString(36).substr(2, 9), name: '', role: 'WORKER', pin: '' }]);
  };

  const updateEmployee = (id: string, updates: Partial<UserProfile>) => {
    setEmployees(employees.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleFinish = async () => {
    if (!config.name || !config.owner || adminPin.length !== 4) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const pmeId = 'PME-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const finalConfig: CompanyConfig = {
        idUnique: pmeId,
        name: config.name || '',
        owner: config.owner || '',
        currency: config.currency || 'FC',
        setupDate: new Date().toISOString(),
      };
      
      const adminUser: UserProfile = {
        id: 'admin-' + Math.random().toString(36).substr(2, 4),
        name: config.owner || '',
        role: 'MANAGER',
        pin: adminPin,
        permissions: Object.values(View) 
      };

      const license: LicenseInfo = {
        key: generatedKey,
        type: 'TRIAL',
        pmeName: config.name || '',
        idUnique: pmeId,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      // ENREGISTREMENT DISTANT (BD NEXA)
      await storageService.registerPmeRemote(finalConfig, adminUser, license);
      
      setStep(4);
    } catch (e: any) {
      setError(e.message || "Erreur serveur. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-2 sm:p-4 relative">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          <div className="lg:col-span-4 bg-slate-800 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-black text-emerald-500 mb-6 tracking-tighter uppercase">nexaPME</h1>
              <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Setup Wizard</p>
                   <div className="flex space-x-1.5">
                      {[1,2,3,4].map(s => (
                        <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-emerald-500 shadow-lg' : 'bg-white/10'}`} />
                      ))}
                   </div>
                </div>
            </div>
            <div className="hidden lg:block">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">v2.5 Deployment</p>
            </div>
          </div>

          <div className="lg:col-span-8 p-6 md:p-16 flex flex-col justify-center">
             
             {step === 1 && (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Identité PME</h2>
                   <p className="text-slate-500 text-sm">Créez votre espace de gestion cloud.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input type="text" placeholder="Nom de la boutique" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500" value={config.name || ''} onChange={(e) => setConfig({...config, name: e.target.value})} />
                    </div>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input type="text" placeholder="Nom du Gérant" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500" value={config.owner || ''} onChange={(e) => setConfig({...config, owner: e.target.value})} />
                    </div>
                 </div>
                 <div className="flex gap-4">
                   <button onClick={onBackToLauncher} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-slate-400">
                     <ChevronLeft size={16}/> Retour
                   </button>
                   <button disabled={!config.name || !config.owner} onClick={() => setStep(2)} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center space-x-3 shadow-xl">
                     <span>Suivant</span><ArrowRight size={18} />
                   </button>
                 </div>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Code Secret</h2>
                   <p className="text-slate-500 text-sm">Saisissez votre PIN administrateur (4 chiffres).</p>
                 </div>
                 <input type="password" maxLength={4} className="w-full py-8 bg-slate-50 border-2 border-slate-100 text-slate-900 rounded-[2rem] font-black text-center text-5xl tracking-[1em] outline-none" value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))} />
                 <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2">
                      <ChevronLeft size={16}/> Retour
                    </button>
                    <button disabled={adminPin.length < 4} onClick={() => setStep(3)} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Suivant</button>
                 </div>
               </div>
             )}

             {step === 3 && (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Collaborateurs</h2>
                   <p className="text-slate-500 text-sm">Ajoutez vos vendeurs ou ignorez pour l'instant.</p>
                 </div>
                 <div className="space-y-3 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                   {employees.map((emp) => (
                     <div key={emp.id} className="p-4 bg-slate-50 rounded-2xl flex items-center space-x-3 border border-slate-100">
                       <input type="text" placeholder="Nom" className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-bold" value={emp.name} onChange={(e) => updateEmployee(emp.id!, { name: e.target.value })} />
                       <input type="password" maxLength={4} placeholder="PIN" className="w-20 p-3 bg-white border border-slate-200 rounded-xl text-center font-black" value={emp.pin} onChange={(e) => updateEmployee(emp.id!, { pin: e.target.value.replace(/\D/g, '') })} />
                       <button onClick={() => setEmployees(employees.filter(e => e.id !== emp.id))} className="text-rose-500"><X size={20} /></button>
                     </div>
                   ))}
                   <button onClick={handleAddEmployee} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold uppercase text-[10px]">Ajouter un vendeur</button>
                 </div>
                 {error && <p className="text-rose-500 text-[10px] font-black uppercase text-center animate-pulse">{error}</p>}
                 <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 flex items-center justify-center gap-2">
                      <ChevronLeft size={16}/> Retour
                    </button>
                    <button disabled={isSubmitting} onClick={handleFinish} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center space-x-3 shadow-xl">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <span>Déployer la PME</span>}
                    </button>
                 </div>
               </div>
             )}

             {step === 4 && (
               <div className="space-y-8 animate-in zoom-in-95">
                  <div className="text-center space-y-4">
                     <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                        <CheckCircle2 size={40} />
                     </div>
                     <h2 className="text-3xl font-black text-slate-900 uppercase">Configuration Terminée !</h2>
                  </div>
                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-center space-y-4 shadow-2xl">
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Clé de Licence (Auto-générée)</p>
                     <div className="flex items-center justify-center space-x-3">
                        <h3 className="text-2xl font-mono font-black text-white">{generatedKey}</h3>
                        <button onClick={copyKey} className="p-2 bg-white/10 text-white rounded-xl">
                           {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                        </button>
                     </div>
                     <p className="text-[9px] text-slate-500 font-bold uppercase">Sauvegardez cette clé pour vos futures connexions.</p>
                  </div>
                  <button onClick={() => onComplete(storageService.getCompanyInfo()!)} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3">
                    <span>Ouvrir mon dashboard</span>
                    <ArrowRight size={20} />
                  </button>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
