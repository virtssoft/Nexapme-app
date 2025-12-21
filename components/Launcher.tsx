
import React, { useState } from 'react';
import { KeyRound, ShieldCheck, HelpCircle, Phone, ArrowRight, Loader2, Sparkles, Clock, Calendar } from 'lucide-react';
import { storageService } from '../services/StorageService';
import { LicenseInfo } from '../types';

interface LauncherProps {
  onValidated: (license: LicenseInfo) => void;
}

const Launcher: React.FC<LauncherProps> = ({ onValidated }) => {
  const [key, setKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const handleValidate = (providedKey?: string) => {
    const keyToValidate = providedKey || key.trim();
    if (!keyToValidate) return;
    
    setIsValidating(true);
    setError('');

    setTimeout(() => {
      const license = storageService.validateLicense(keyToValidate);
      if (license) {
        onValidated(license);
      } else {
        setError(providedKey === 'TRIAL_MODE' ? 'Période d\'essai expirée.' : 'Clé invalide ou expirée.');
      }
      setIsValidating(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full z-10 space-y-8 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 mb-4">
            <Sparkles className="text-emerald-500" size={40} />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase">nexa<span className="text-emerald-500">PME</span></h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Système de Gestion Intégré</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Bouton Essai Gratuit */}
            <button 
              onClick={() => handleValidate('TRIAL_MODE')}
              disabled={isValidating}
              className="group relative overflow-hidden w-full py-5 bg-white/5 hover:bg-emerald-500/10 border-2 border-white/10 hover:border-emerald-500/50 rounded-2xl transition-all duration-300 flex flex-col items-center"
            >
              <div className="flex items-center space-x-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-1">
                <Clock size={12} />
                <span>Nouveaux Utilisateurs</span>
              </div>
              <span className="text-white font-black text-xs uppercase tracking-widest">Essai Gratuit (7 Jours)</span>
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <Calendar size={48} />
              </div>
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center"><span className="px-4 bg-transparent text-[8px] font-black text-slate-600 uppercase tracking-widest">ou avec une licence</span></div>
            </div>

            {/* Input Clé de Licence */}
            <div className="space-y-3">
              <div className="relative">
                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Clé de licence..."
                  className="w-full pl-14 pr-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black tracking-widest outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 text-sm"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
                />
              </div>
              {error && <p className="text-[10px] font-black text-rose-500 uppercase px-2 text-center animate-bounce">{error}</p>}
              
              <button 
                onClick={() => handleValidate()}
                disabled={isValidating || !key}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 flex items-center justify-center space-x-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {isValidating ? <Loader2 className="animate-spin" size={18} /> : <span>Activer la Licence</span>}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="w-full text-slate-500 hover:text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors"
            >
              <HelpCircle size={14} />
              <span>Besoin d'aide ou d'une clé ?</span>
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl animate-in slide-in-from-top-4">
            <div className="flex items-start space-x-4 text-emerald-400">
              <Phone className="shrink-0 mt-1" size={20} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1">Service Commercial nexaPME</p>
                <p className="text-lg font-black">+243 993 809 052</p>
                <p className="text-[10px] font-medium text-emerald-500/60 mt-1">
                  Obtenez votre clé pour 6 mois, 1 an ou 2 ans en contactant nos agents.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Launcher;
