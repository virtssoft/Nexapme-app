
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { UserProfile } from '../types';
import Branding from '../components/Branding';
import { Lock, User, ArrowRight, Loader2, LogOut as ExitIcon, ChevronLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onExit: () => void;
  companyName: string;
  category: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, onExit, companyName, category }) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const users = storageService.getUsers();

  const handleLogin = async () => {
    if (selectedUser && pin.length === 4) {
      setIsLoggingIn(true);
      setError('');
      
      try {
        const pmeId = storageService.getActiveCompanyId() || '';
        const authData = await storageService.loginRemote(pmeId, selectedUser.id, pin);
        
        if (authData) {
          onLogin(authData.user);
        } else {
          setError('PIN incorrect');
          setPin('');
        }
      } catch (e: any) {
        setError(e.message || 'Erreur d\'authentification');
        setPin('');
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative z-10">
        <div className="p-8 bg-slate-900 text-white text-center flex justify-center border-b border-slate-800">
          <Branding companyName={companyName} category={category} variant="dark" size="md" />
        </div>
        
        <div className="p-8 md:p-10 space-y-8">
          {!selectedUser ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-1">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Sélection du personnel</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Choisissez votre compte pour continuer</p>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                {users.map(user => (
                  <button 
                    key={user.id} 
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl shadow-sm transition-all group-hover:scale-110 ${user.role === 'MANAGER' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        <User size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-800 text-sm">{user.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.role === 'MANAGER' ? 'Gérant' : 'Vendeur'}</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={onExit}
                  className="w-full flex items-center justify-center space-x-3 p-5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group"
                >
                  <ExitIcon size={18} className="group-hover:-translate-x-1 transition-all" />
                  <span className="font-black text-[10px] uppercase tracking-[0.2em]">Quitter l'entreprise</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <button 
                  onClick={() => { setSelectedUser(null); setPin(''); setError(''); }} 
                  className="inline-flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-900 transition-colors mb-6 group"
                >
                   <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-all" />
                   <span>Retour à la liste</span>
                </button>

                <div className="relative inline-block">
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 transition-all duration-500 ${isLoggingIn ? 'bg-slate-900 text-emerald-400 shadow-emerald-500/20 shadow-2xl' : 'bg-emerald-100 text-emerald-600 shadow-xl'}`}>
                    {isLoggingIn ? <Loader2 className="animate-spin" size={32} /> : <Lock size={32} />}
                  </div>
                  {!isLoggingIn && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-900 border border-slate-100 animate-bounce">
                      <User size={16} />
                    </div>
                  )}
                </div>

                <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">{selectedUser.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Entrez votre code secret</p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <input 
                    type="password" 
                    maxLength={4}
                    placeholder="••••"
                    disabled={isLoggingIn}
                    className="w-full text-center py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-3xl font-black tracking-[0.8em] outline-none focus:border-slate-900 focus:bg-white transition-all shadow-inner"
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPin(val);
                      if (val.length === 4) {
                        setError('');
                        // Trigger login automatically when 4 digits are entered
                        // setTimeout for better UX
                        if (val.length === 4) setTimeout(handleLogin, 100);
                      }
                    }}
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-center justify-center space-x-2 p-3 bg-rose-50 text-rose-500 rounded-xl animate-in shake duration-300">
                    <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                  </div>
                )}

                <button 
                  onClick={handleLogin}
                  disabled={pin.length < 4 || isLoggingIn}
                  className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoggingIn ? 'Identification...' : 'Ouvrir la session'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer support */}
      <div className="absolute bottom-6 left-0 w-full text-center px-4">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">nexaPME Security Protocol v2.5</p>
      </div>
    </div>
  );
};

export default Login;
