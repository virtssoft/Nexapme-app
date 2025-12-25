
import React, { useState, useEffect } from 'react';
import { KeyRound, HelpCircle, Phone, Loader2, Sparkles, Clock, ShieldCheck, CheckCircle } from 'lucide-react';
import { storageService } from '../services/StorageService';
import { ApiService } from '../services/ApiService';
import { LicenseInfo } from '../types';

interface LauncherProps {
  onValidated: (license: LicenseInfo) => void;
}

const Launcher: React.FC<LauncherProps> = ({ onValidated }) => {
  const [key, setKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    ApiService.checkStatus().then(setServerOnline);
  }, []);

  const isAdminKey = key.trim() === 'nexaPME2025';

  const handleValidate = async (providedKey?: string) => {
    const keyToValidate = providedKey || key.trim();
    if (!keyToValidate) return;
    
    setIsValidating(true);
    setError('');

    try {
      const license = await storageService.validateLicenseRemote(keyToValidate);
      if (license) {
        onValidated(license);
      } else {
        setError('Licence invalide ou désactivée.');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de liaison avec le serveur nexaPME.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4 overflow-x-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full z-10 space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-2">
            <Sparkles className="text-emerald-500" size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">nexa<span className="text-emerald-500">PME</span></h1>
          <p className="text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.3em]">Cloud Business Solutions</p>
          
          <div className={`mt-2 inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${serverOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <span>{serverOnline ? 'Serveur Nexa Connecté' : 'Serveur Nexa Hors-Ligne'}</span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-3xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => handleValidate('TRIAL_MODE')}
              disabled={isValidating}
              className="group relative overflow-hidden w-full py-5 bg-white/5 hover:bg-emerald-500/10 border-2 border-white/10 hover:border-emerald-500/50 rounded-2xl transition-all duration-300 flex flex-col items-center"
            >
              <div className="flex items-center space-x-2 text-emerald-400 font-black text-[9px] uppercase tracking-widest mb-1">
                <Clock size={12} />
                <span>Nouveaux Utilisateurs</span>
              </div>
              <span className="text-white font-black text-xs uppercase tracking-widest">Démarrer Essai 7 Jours</span>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center"><span className="px-4 bg-transparent text-[8px] font-black text-slate-600 uppercase tracking-widest">Accès Client</span></div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                {isAdminKey ? (
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 animate-pulse" size={18} />
                ) : (
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                )}
                <input 
                  type="text" 
                  placeholder="Entrez votre clé..."
                  className={`w-full pl-12 pr-6 py-4 bg-white/5 border-2 rounded-2xl text-white font-bold tracking-widest outline-none transition-all placeholder:text-slate-600 text-sm ${isAdminKey ? 'border-emerald-500/50 focus:border-emerald-400' : 'border-white/10 focus:border-blue-500'}`}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
                />
              </div>
              {isAdminKey && (
                <div className="flex items-center justify-center space-x-2 text-emerald-400 animate-in slide-in-from-top-2">
                  <CheckCircle size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Accès Système ROOT Détecté</span>
                </div>
              )}
              {error && <p className="text-[9px] font-black text-rose-500 uppercase px-2 text-center animate-pulse">{error}</p>}
              
              <button 
                onClick={() => handleValidate()}
                disabled={isValidating || !key}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 transition-all active:scale-95 disabled:opacity-50 ${isAdminKey ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-900 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
              >
                {isValidating ? <Loader2 className="animate-spin" size={18} /> : <span>{isAdminKey ? 'Gérer les PME nexaPME' : 'Vérifier la Licence'}</span>}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="w-full text-slate-500 hover:text-emerald-400 font-black text-[9px] uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors"
            >
              <HelpCircle size={14} />
              <span>Besoin d'aide ? Contactez-nous</span>
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl animate-in slide-in-from-top-4">
            <div className="flex flex-col items-center text-center text-emerald-400">
              <p className="text-[9px] font-black uppercase tracking-widest mb-1">Support technique nexaPME</p>
              <p className="text-xl font-black flex items-center gap-2"><Phone size={16}/> +243 993 809 052</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Launcher;
