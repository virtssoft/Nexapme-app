
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { PMEEntry } from '../types';
import { 
  Users, Key, Plus, Trash2, Search, Building2, 
  ShieldCheck, RefreshCw, X, Copy, CheckCircle2, Loader2
} from 'lucide-react';

const AdminSpace: React.FC = () => {
  const [pmeList, setPmeList] = useState<PMEEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadPmes();
  }, []);

  const loadPmes = async () => {
    setIsLoading(true);
    const data = await storageService.getPmeListRemote();
    setPmeList(data);
    setIsLoading(false);
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto p-4 lg:p-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">nexaPME <span className="text-emerald-500">DATABASE</span></h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Données Centralisées en Temps Réel</p>
        </div>
        <button onClick={loadPmes} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-xl">
          <RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} />
        </button>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 text-slate-300">
           <Loader2 className="animate-spin mb-4" size={64} />
           <p className="font-black uppercase text-xs tracking-widest">Accès à la base de données comfortasbl.org...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pmeList.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <div key={p.idUnique} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 px-4 py-1 bg-blue-600 text-white text-[8px] font-black uppercase">
                 DB Active
               </div>
               <div className="flex items-center space-x-4 mb-6">
                  <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase leading-none">{p.name}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">ID DB: {p.idUnique}</p>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <p className="font-mono font-black text-slate-800 tracking-wider text-sm">{p.licenseKey}</p>
                  <button onClick={() => copyToClipboard(p.licenseKey)} className="p-3 text-slate-400 hover:text-emerald-500">
                    {copiedKey === p.licenseKey ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSpace;
