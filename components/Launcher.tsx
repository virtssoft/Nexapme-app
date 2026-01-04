
import React, { useState, useEffect } from 'react';
import { KeyRound, HelpCircle, Phone, Loader2, Sparkles, Clock, RefreshCw, AlertTriangle, ShieldCheck, Globe, Info } from 'lucide-react';
import { storageService } from '../services/StorageService';
import { ApiService } from '../services/ApiService';
import { LicenseInfo } from '../types';

interface LauncherProps {
  onValidated: (license: LicenseInfo) => void;
}

const Launcher: React.FC<LauncherProps> = ({ onValidated }: LauncherProps) => {
  const [key, setKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showCorsInfo, setShowCorsInfo] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const checkStatus = async () => {
    setServerOnline(null); 
    const online = await ApiService.checkStatus();
    setServerOnline(online);
    return online;
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleValidate = async (providedKey?: string) => {
    const keyToValidate = (providedKey || key).trim().toUpperCase();
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
      if (e.message.includes("ERREUR_CLOUD") || e.message.includes("Failed to fetch")) {
        setError("Liaison Cloud Interrompue. Votre serveur ne répond pas ou bloque l'accès (CORS).");
        setShowCorsInfo(true);
      } else {
        setError(e.message || 'Erreur de liaison avec le serveur nexaPME.');
      }
      checkStatus();
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4 overflow-x-hidden relative font-['Inter']">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full z-10 space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl mb-2">
            <Sparkles className="text-emerald-400" size={40} />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">
              nexa<span className="text-emerald-500">PME</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em]">Cloud Business OS</p>
          </div>
          
          <div className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${
            serverOnline === null ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' : 
            serverOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
            'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {serverOnline === null ? <RefreshCw size={12} className="animate-spin" /> : <Globe size={12} />}
            <span>{serverOnline === null ? 'Liaison Cloud...' : serverOnline ? 'Serveur Nexa Connecté' : 'Liaison Cloud Interrompue'}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); checkStatus(); }} 
              className={`ml-2 p-1 hover:bg-white/10 rounded-full transition-all ${serverOnline === null ? 'opacity-50' : 'opacity-100'}`}
              title="Actualiser la connexion"
            >
              <RefreshCw size={10} className={serverOnline === null ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="VOTRE CLÉ DE LICENCE"
                  className="w-full pl-12 pr-6 py-5 bg-white/5 border-2 border-white/5 focus:border-emerald-500/50 rounded-2xl text-white font-black outline-none transition-all placeholder:text-slate-700 text-sm"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
                />
              </div>
              
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-3 animate-in shake duration-300">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-tight leading-tight">{error}</p>
                  </div>
                  
                  {showCorsInfo && (
                    <div className="p-3 bg-blue-500/10 rounded-xl text-[8px] font-bold text-blue-300 uppercase leading-relaxed">
                      Conseil : Vérifiez que le fichier <code className="text-white">api/index.php</code> existe et contient les headers CORS.
                    </div>
                  )}
                </div>
              )}
              
              <button 
                onClick={() => handleValidate()}
                disabled={isValidating || !key}
                className="group w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
              >
                {isValidating ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Activer ma Licence</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="w-full text-slate-500 hover:text-white font-black text-[9px] uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors py-2"
            >
              <HelpCircle size={14} />
              <span>Besoin d'aide ?</span>
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] animate-in slide-in-from-top-4 backdrop-blur-md">
            <div className="flex flex-col items-center text-center space-y-2">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Support Technique nexaPME</p>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-500 text-slate-900 rounded-2xl">
                   <Phone size={20} />
                </div>
                <p className="text-2xl font-black text-white">+243 993 809 052</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Launcher;
