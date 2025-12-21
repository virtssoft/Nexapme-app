
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { UserProfile } from '../types';
import Branding from '../components/Branding';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  companyName: string;
  category: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, companyName, category }) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const users = storageService.getUsers();

  const handleLogin = () => {
    if (selectedUser && pin === selectedUser.pin) {
      storageService.setCurrentUser(selectedUser);
      onLogin(selectedUser);
    } else {
      setError('Code PIN incorrect');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-10 bg-slate-800 text-white text-center flex justify-center">
          <Branding companyName={companyName} category={category} variant="dark" size="md" />
        </div>
        
        <div className="p-10 space-y-8">
          {!selectedUser ? (
            <div className="space-y-4">
              <h3 className="text-center font-black text-slate-800 uppercase text-xs tracking-widest mb-6">Sélectionnez un utilisateur</h3>
              <div className="grid grid-cols-1 gap-3">
                {users.map(user => (
                  <button 
                    key={user.id} 
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-emerald-500 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${user.role === 'MANAGER' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        <User size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-800">{user.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center">
                <button onClick={() => setSelectedUser(null)} className="text-[10px] font-black text-slate-400 uppercase hover:text-slate-900 mb-4 tracking-widest flex items-center justify-center mx-auto space-x-2">
                   <ArrowRight size={12} className="rotate-180" />
                   <span>Changer d'utilisateur</span>
                </button>
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                   <Lock size={32} />
                </div>
                <h3 className="font-black text-slate-800 uppercase text-sm">Session {selectedUser.name}</h3>
                <p className="text-xs text-slate-400 font-medium">Entrez votre code PIN secret</p>
              </div>

              <div className="space-y-4">
                <input 
                  type="password" 
                  maxLength={4}
                  placeholder="PIN"
                  className="w-full text-center py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black tracking-[1em] outline-none focus:border-slate-900 transition-all"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPin(val);
                    if (val.length === 4) setError('');
                  }}
                  autoFocus
                />
                {error && <p className="text-center text-rose-500 text-[10px] font-black uppercase">{error}</p>}
                <button 
                  onClick={handleLogin}
                  disabled={pin.length < 4}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all disabled:opacity-50"
                >
                  Accéder au système
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
