
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
  
  // Clé générée pour le mode Essai si pas de clé déjà présente
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
        name: config.name,
        owner: config.owner,
        currency: config.currency || 'FC',
        setupDate: new Date().toISOString(),
      };
      
      const adminUser: UserProfile = {
        id: 'admin-' + Math.random().toString(36).substr(2, 4),
        name: config.owner,
        role: 'MANAGER',
        pin: adminPin,
        permissions: Object.values(View) 
      };

      const license: LicenseInfo = {
        key: generatedKey,
        type: 'TRIAL',
        pmeName: config.name,
        idUnique: pmeId,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      // ENREGISTREMENT DISTANT DANS LA BD NEXA
      await storageService.registerPmeRemote(finalConfig, adminUser, license);
      
      // On passe à la dernière étape (affichage de la clé)
      setStep(4);
    } catch (e: any) {
      setError(e.message || "Échec de l'enregistrement sur le serveur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-2 sm:p-4 relative">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* Sidebar decorative */}
          <div className="lg:col-span-4 bg-slate-800 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent tracking-tighter mb-4 md:mb-6">nexaPME</h1>
              <div className="p-4 md:p-5 bg-white/5 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 md:mb-3">Setup Cloud Business</p>
                   <div className="flex space-x-1.5">
                      {[1,2,3,4].map(s => (
                        <div key={s} className={`h-1.5 md:h-2 flex-1 rounded-full ${step >= s ? 'bg-emerald-500 shadow-lg' : 'bg-white/10'}`} />
                      ))}
                   </div>
                </div>
                <div className="mt-6 md:mt-8 space-y-3">
                   <p className="text-slate-400 text-[10px] md:text-xs leading-relaxed font-medium italic">
                     "Votre PME mérite une gestion moderne. Nous configurons votre espace sécurisé sur nos serveurs."
                   </p>
                </div>
            </div>
            <div className="hidden lg:block relative z-10">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Deployment System v2.5</p>
            </div>
          </div>

          <div className="lg:col-span-8 p-6 md:p-12 lg:p-16 flex flex-col justify-center">
             
             {step === 1 && (
               <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                 <header>
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Nouvelle PME Cloud</h2>
                   <p className="text-slate-500 text-sm">Configurez l'identité de votre entreprise sur Nexa.</p>
                 </header>
                 <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nom commercial</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input type="text" placeholder="Ex: Boutique Horizon" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" value={config.name || ''} onChange={(e) => setConfig({...config, name: e.target.value})} />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nom complet du Gérant</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input type="text" placeholder="Ex: Jean Paul Kasongo" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" value={config.owner || ''} onChange={(e) => setConfig({...config, owner: e.target.value})} />
                      </div>
                   </div>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3">
                   <button onClick={onBackToLauncher} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                     <ChevronLeft size={16}/> Retour
                   </button>
                   <button disabled={!config.name || !config.owner} onClick={() => setStep(2)} className="flex-[2] py-4 md:py-5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center space-x-3 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 shadow-xl">
                     <span>Suivant</span><ArrowRight size={18} />
                   </button>
                 </div>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                 <header>
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Code Secret Gérant</h2>
                   <p className="text-slate-500 text-sm">Ce PIN de 4 chiffres protège l'accès à votre administration.</p>
                 </header>
                 <div className="flex flex-col items-center">
                    <input type="password" maxLength={4} placeholder="****" className="w-full px-6 py-6 md:py-8 bg-slate-50 border-2 border-slate-100 text-slate-900 rounded-[2rem] font-black text-center text-4xl md:text-5xl tracking-[1.2em] outline-none focus:border-emerald-500" value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))} />
                 </div>
                 <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                      <ChevronLeft size={16}/> Retour
                    </button>
                    <button disabled={adminPin.length < 4} onClick={() => setStep(3)} className="flex-[2] py-4 md:py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all">Suivant</button>
                 </div>
               </div>
             )}

             {step === 3 && (
               <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                 <header>
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Collaborateurs</h2>
                   <p className="text-slate-500 text-sm">Ajoutez vos vendeurs (Optionnel, modifiable plus tard).</p>
                 </header>
                 <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
                   {employees.map((emp) => (
                     <div key={emp.id} className="p-3 md:p-4 bg-slate-50 rounded-2xl flex items-center space-x-2 md:space-x-3 border border-slate-100">
                       <input type="text" placeholder="Nom Vendeur" className="flex-1 p-2 md:p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={emp.name} onChange={(e) => updateEmployee(emp.id!, { name: e.target.value })} />
                       <input type="password" maxLength={4} placeholder="PIN" className="w-16 md:w-20 p-2 md:p-3 bg-white border border-slate-200 rounded-xl text-center font-black tracking-widest text-sm" value={emp.pin} onChange={(e) => updateEmployee(emp.id!, { pin: e.target.value.replace(/\D/g, '') })} />
                       <button onClick={() => setEmployees(employees.filter(e => e.id !== emp.id))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><X size={20} /></button>
                     </div>
                   ))}
                   <button onClick={handleAddEmployee} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold uppercase text-[10px] hover:border-emerald-400 hover:text-emerald-500 transition-all">Ajouter un Vendeur</button>
                 </div>
                 
                 {error && <p className="text-rose-500 text-[10px] font-black uppercase text-center animate-pulse">{error}</p>}

                 <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button onClick={() => setStep(2)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                      <ChevronLeft size={16}/> Retour
                    </button>
                    <button disabled={isSubmitting} onClick={handleFinish} className="flex-[2] py-4 md:py-5 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center space-x-3 shadow-xl hover:bg-emerald-500 transition-all">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <span>Déployer la PME</span>}
                    </button>
                 </div>
               </div>
             )}

             {step === 4 && (
               <div className="space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="text-center space-y-4">
                     <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                        <CheckCircle2 size={40} />
                     </div>
                     <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Déploiement Terminé !</h2>
                     <p className="text-slate-500 text-sm font-medium">Votre PME est désormais enregistrée dans notre base de données cloud.</p>
                  </div>

                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Sparkles size={100} /></div>
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Votre Clé de Licence Nexa</p>
                     <div className="flex items-center justify-center space-x-3">
                        <h3 className="text-2xl md:text-3xl font-mono font-black text-white tracking-widest">{generatedKey}</h3>
                        <button onClick={copyKey} className="p-2 bg-white/10 hover:bg-emerald-500 text-white rounded-xl transition-all">
                           {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                        </button>
                     </div>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                        Conservez précieusement cette clé.<br/>Elle vous permettra de vous reconnecter ultérieurement.
                     </p>
                  </div>

                  <button 
                    onClick={() => onComplete(storageService.getCompanyInfo()!)}
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center space-x-3"
                  >
                    <span>Lancer mon Tableau de Bord</span>
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
