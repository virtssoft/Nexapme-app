
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { CompanyConfig, UserProfile, View, LicenseInfo } from '../types';
import { 
  ArrowRight, CheckCircle2, Lock, Sparkles, Building2, User, 
  ChevronLeft, X, Copy, CheckCircle, Loader2, ShieldCheck, Users, Plus, Terminal, LogIn
} from 'lucide-react';

interface OnboardingProps {
  onComplete: (config: CompanyConfig) => void;
  onBackToLauncher: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onBackToLauncher }) => {
  const activeLicense = storageService.getLicense();
  
  // 1: Révision Licence, 2: Profil Propriétaire, 3: Terminal de Succès
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Données de la licence (Modifiables en étape 1)
  const [pmeData, setPmeData] = useState({
    name: activeLicense?.pmeName || '',
    owner: activeLicense?.pmeName || '' // On suppose que par défaut c'est le nom de la PME
  });

  // PIN du propriétaire (Étape 2)
  const [ownerPin, setOwnerPin] = useState('');

  // Gestion des travailleurs (Étape 3)
  const [workers, setWorkers] = useState<Partial<UserProfile>[]>([]);
  const [isAddingWorker, setIsAddingWorker] = useState(false);

  const handleAddWorker = () => {
    setWorkers([...workers, { 
      id: 'USR-' + Math.random().toString(36).substr(2, 6).toUpperCase(), 
      name: '', 
      role: 'WORKER', 
      pin: '' 
    }]);
    setIsAddingWorker(true);
  };

  const updateWorker = (id: string, updates: Partial<UserProfile>) => {
    setWorkers(workers.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const removeWorker = (id: string) => {
    setWorkers(workers.filter(w => w.id !== id));
    if (workers.length <= 1) setIsAddingWorker(false);
  };

  // Traitement final de l'étape 2 (Création PME + Propriétaire)
  const handleApproveOwner = async () => {
    if (ownerPin.length !== 4) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const pmeId = activeLicense?.idUnique || 'PME-' + Date.now();
      
      const config: CompanyConfig = {
        idUnique: pmeId,
        name: pmeData.name,
        owner: pmeData.owner,
        currency: 'FC',
        setupDate: new Date().toISOString(),
      };

      const ownerUser: UserProfile = {
        id: 'USR-PROPRIO-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        name: pmeData.owner,
        role: 'MANAGER',
        pin: ownerPin,
        permissions: Object.values(View)
      };

      // Synchronisation Cloud
      await storageService.registerPmeRemote(config, ownerUser, activeLicense!);
      
      // Passage au Terminal
      setStep(3);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la validation. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalisation : Enregistrement des travailleurs et redirection vers Login
  const handleFinalizeAndLogin = async () => {
    setIsSubmitting(true);
    try {
      // Sauvegarde des travailleurs ajoutés dans le terminal
      for (const worker of workers) {
        if (worker.name && worker.pin?.length === 4) {
          await storageService.saveNewUser({
            id: worker.id,
            name: worker.name,
            role: 'WORKER',
            pin: worker.pin
          });
        }
      }
      // On déclenche la fin de l'onboarding dans App.tsx
      onComplete(storageService.getCompanyInfo()!);
    } catch (e: any) {
      setError("Erreur lors de la création des travailleurs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-emerald-500 rounded-full blur-[150px]"></div>
      </div>

      <div className="max-w-5xl w-full bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
          
          {/* Sidebar decorative */}
          <div className="lg:col-span-4 bg-slate-900 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-black text-emerald-500 mb-6 tracking-tighter uppercase">nexaPME</h1>
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md">
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Cloud Configuration</p>
                 <div className="flex space-x-2">
                    {[1,2,3].map(s => (
                      <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                    ))}
                 </div>
              </div>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Session</p>
                <p className="text-sm font-black text-white uppercase truncate">
                    {step === 1 ? 'Infos Licence' : step === 2 ? 'Propriétaire' : 'Terminal Cloud'}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-8 p-6 md:p-16 flex flex-col justify-center bg-slate-50/30">
             
             {/* ÉTAPE 1: FORMULAIRE RÉVISION LICENCE */}
             {step === 1 && (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                 <div>
                   <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">Révision Licence</h2>
                   <p className="text-slate-500 text-sm font-medium mt-2">Vérifiez les informations récupérées de votre clé.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase px-2">Nom de l'Entreprise</label>
                      <div className="relative">
                        <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input type="text" className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] font-bold text-lg outline-none focus:border-emerald-500 transition-all uppercase" value={pmeData.name} onChange={(e) => setPmeData({...pmeData, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase px-2">Nom du Propriétaire Réel</label>
                      <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input type="text" className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] font-bold text-lg outline-none focus:border-emerald-500 transition-all" value={pmeData.owner} onChange={(e) => setPmeData({...pmeData, owner: e.target.value})} />
                      </div>
                    </div>
                 </div>
                 <div className="flex gap-4">
                   <button onClick={onBackToLauncher} className="flex-1 py-5 border-2 border-slate-200 rounded-2xl font-black text-[10px] uppercase text-slate-400 flex items-center justify-center gap-2">
                     <ChevronLeft size={16}/> Annuler
                   </button>
                   <button disabled={!pmeData.name || !pmeData.owner} onClick={() => setStep(2)} className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center space-x-3 shadow-xl hover:bg-black transition-all">
                     <span className="text-xs uppercase tracking-widest">Approuver & Continuer</span>
                     <ArrowRight size={18} />
                   </button>
                 </div>
               </div>
             )}

             {/* ÉTAPE 2: CONFIGURATION USER (PROPRIÉTAIRE) */}
             {step === 2 && (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                 <div className="space-y-3">
                   <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                     <ShieldCheck size={14} />
                     <span>Compte Propriétaire</span>
                   </div>
                   <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Configuration Profil</h2>
                   <p className="text-slate-500 text-sm leading-relaxed font-medium">
                     Définissez l'accès pour <strong>{pmeData.owner}</strong>.
                   </p>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Confirmer le nom d'accès</label>
                        <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={pmeData.owner} disabled />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Code Secret (PIN 4 chiffres)</label>
                        <input 
                            type="password" 
                            maxLength={4} 
                            placeholder="••••"
                            className="w-full text-center py-8 bg-white border-2 border-slate-100 text-slate-900 rounded-[2.5rem] font-black text-6xl tracking-[0.5em] outline-none focus:border-emerald-500 shadow-xl" 
                            value={ownerPin} 
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setOwnerPin(val);
                                if (error) setError('');
                            }} 
                            autoFocus
                        />
                    </div>
                 </div>

                 {error && (
                   <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 text-center animate-in shake">
                      <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                   </div>
                 )}

                 <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="flex-1 py-5 border-2 border-slate-200 rounded-2xl font-black text-[10px] uppercase text-slate-400 flex items-center justify-center gap-2">
                      <ChevronLeft size={16}/> Retour
                    </button>
                    <button disabled={ownerPin.length < 4 || isSubmitting} onClick={handleApproveOwner} className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all">
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Approuver & Créer le Profil"}
                    </button>
                 </div>
               </div>
             )}

             {/* ÉTAPE 3: TERMINAL DE SUCCÈS & OPTIONS PERSONNEL */}
             {step === 3 && (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                 <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden min-h-[400px] flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500"><Terminal size={140} /></div>
                    
                    <div className="flex items-center space-x-4 relative z-10">
                        <div className="w-14 h-14 bg-emerald-500 text-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                            <CheckCircle2 size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Profil Cloud Activé</h3>
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Compte Propriétaire prêt</p>
                        </div>
                    </div>

                    {!isAddingWorker ? (
                      <div className="flex-1 flex flex-col justify-center space-y-6 relative z-10">
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Le système est désormais configuré pour <strong>{pmeData.name}</strong>. 
                            Vous pouvez accéder à l'interface de connexion ou ajouter des comptes pour vos travailleurs.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={handleAddWorker} className="p-6 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 transition-all group">
                                <Users className="text-blue-400 mb-3 group-hover:scale-110 transition-transform" size={24} />
                                <p className="text-xs font-black text-white uppercase tracking-widest">Ajouter un travailleur</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Saisir un autre compte</p>
                            </button>
                            <button onClick={handleFinalizeAndLogin} className="p-6 bg-emerald-500 rounded-2xl text-left hover:bg-emerald-400 transition-all group shadow-xl">
                                <LogIn className="text-slate-900 mb-3 group-hover:translate-x-1 transition-transform" size={24} />
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Aller à la connexion</p>
                                <p className="text-[9px] text-emerald-900 font-bold uppercase mt-1">Ouvrir ma session</p>
                            </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col space-y-4 animate-in zoom-in-95">
                         <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
                            {workers.map((w) => (
                                <div key={w.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center space-x-3">
                                    <div className="flex-1 relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                        <input type="text" placeholder="Nom du travailleur" className="w-full pl-12 pr-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500" value={w.name} onChange={(e) => updateWorker(w.id!, { name: e.target.value })} />
                                    </div>
                                    <div className="w-24 relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                        <input type="password" maxLength={4} placeholder="PIN" className="w-full pl-8 pr-2 py-3 bg-black/20 border border-white/5 rounded-xl text-center text-white font-black text-sm outline-none focus:border-blue-500 tracking-widest" value={w.pin} onChange={(e) => updateWorker(w.id!, { pin: e.target.value.replace(/\D/g, '') })} />
                                    </div>
                                    <button onClick={() => removeWorker(w.id!)} className="p-2 text-rose-500">
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                         </div>
                         <div className="flex gap-3 pt-4">
                            <button onClick={handleAddWorker} className="flex-1 py-4 border border-dashed border-white/20 rounded-2xl text-slate-400 font-black uppercase text-[9px] tracking-widest flex items-center justify-center space-x-2">
                                <Plus size={16} /> <span>Ajouter un autre</span>
                            </button>
                            <button onClick={handleFinalizeAndLogin} className="flex-[2] py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2">
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                                    <><span>Finaliser & Se Connecter</span> <ArrowRight size={18} /></>
                                )}
                            </button>
                         </div>
                      </div>
                    )}
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
