
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { CashFlow } from '../types';
import { Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, User, Wallet, X } from 'lucide-react';

const CashJournal: React.FC = () => {
  const [flows, setFlows] = useState<CashFlow[]>(storageService.getCashFlow());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CashFlow>>({ type: 'OUT' });

  const balance = storageService.getCashBalance();
  const totalIn = flows.filter(f => f.type === 'IN').reduce((acc, f) => acc + f.amount, 0);
  const totalOut = flows.filter(f => f.type === 'OUT').reduce((acc, f) => acc + f.amount, 0);

  const handleSave = () => {
    const amount = Number(formData.amount) || 0;
    const type = formData.type as 'IN' | 'OUT';

    if (type === 'OUT' && amount > balance) {
      if (!confirm(`Attention: Vous dépensez ${amount.toLocaleString()} FC alors que la caisse ne contient que ${balance.toLocaleString()} FC. Continuer quand même ?`)) {
        return;
      }
    }

    storageService.recordCashFlow(
      amount,
      type,
      formData.category || 'Autre',
      formData.description || 'Saisie manuelle'
    );
    
    setFlows(storageService.getCashFlow());
    setIsModalOpen(false);
    setFormData({ type: 'OUT' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Livre de Caisse</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Suivi des entrées et sorties de fonds</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg"
        >
          <Plus size={20} />
          <span className="font-black text-xs uppercase tracking-widest">Saisie Manuelle</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Entrées</p>
          <h3 className="text-2xl font-black text-emerald-600">{totalIn.toLocaleString()} FC</h3>
          <ArrowUpRight className="absolute top-4 right-4 text-emerald-100" size={48} />
        </div>
        <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Sorties</p>
          <h3 className="text-2xl font-black text-rose-600">{totalOut.toLocaleString()} FC</h3>
          <ArrowDownRight className="absolute top-4 right-4 text-rose-100" size={48} />
        </div>
        <div className="bg-slate-900 p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Solde Disponible</p>
          <h3 className="text-2xl font-black text-white">{balance.toLocaleString()} FC</h3>
          <Wallet className="absolute top-4 right-4 text-white/5" size={48} />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center space-x-2">
          <TrendingUp size={20} className="text-slate-400" />
          <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Dernières Opérations</h4>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">Opération</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Auteur</th>
                <th className="px-8 py-4 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {flows.map(flow => (
                <tr key={flow.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-xl ${flow.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {flow.type === 'IN' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-xs uppercase">{flow.description}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black">{flow.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase">
                    {new Date(flow.date).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-black uppercase">
                      <User size={12} />
                      <span>{flow.author}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className={`font-black text-sm ${flow.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {flow.type === 'IN' ? '+' : '-'} {flow.amount.toLocaleString()} FC
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-0 md:p-4 overflow-hidden">
          <div className="bg-white rounded-none md:rounded-[2.5rem] w-full max-w-md max-h-screen md:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="text-xs font-black uppercase tracking-widest">Saisie de Caisse</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setFormData({...formData, type: 'IN'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrée (+)</button>
                <button onClick={() => setFormData({...formData, type: 'OUT'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'OUT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Sortie (-)</button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Montant (FC)</label>
                <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-black outline-none focus:border-slate-900" placeholder="0" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Catégorie</label>
                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-black outline-none focus:border-slate-900" value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option value="Charges">Charges (Loyer, Elec...)</option>
                  <option value="Personnel">Salaires / Avances</option>
                  <option value="Achat">Achat Divers</option>
                  <option value="Divers">Autre Flux</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Libellé de l'opération</label>
                <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold outline-none focus:border-slate-900" placeholder="Détail..." value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t shrink-0">
              <button onClick={handleSave} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Enregistrer le flux</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashJournal;
