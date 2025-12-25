
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { Credit } from '../types';
import { Search, ChevronRight, CheckCircle2, History, User, Wallet, X } from 'lucide-react';

const Credits: React.FC = () => {
  const [credits, setCredits] = useState<Credit[]>(storageService.getCredits());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Fetch fresh credits on component mount to populate local cache
  useEffect(() => {
    storageService.fetchCredits().then(data => setCredits(data));
  }, []);

  const filteredCredits = credits.filter(c => 
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) && c.status === 'PENDING'
  );

  // Handle payment asynchronously to ensure cache is updated before refreshing local state
  const handlePayment = async () => {
    if (!selectedCredit || paymentAmount <= 0) return;
    
    await storageService.repayCredit(selectedCredit.id, paymentAmount);
    setCredits(storageService.getCredits()); // Refresh local state from updated cache
    
    setSelectedCredit(null);
    setPaymentAmount(0);
    alert("Paiement enregistré ! Le montant a été ajouté à votre Journal de Caisse.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500 pb-24">
      <div className="lg:col-span-7 space-y-4">
        <header>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Crédits Clients</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Suivi des impayés et remboursements</p>
        </header>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
          <Search size={20} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher un client..." 
            className="flex-1 outline-none font-bold text-sm bg-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {filteredCredits.map(credit => (
            <button 
              key={credit.id}
              onClick={() => setSelectedCredit(credit)}
              className="w-full bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-500 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-800 uppercase text-xs">{credit.customerName}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Initial: {storageService.formatFC(credit.initialAmount)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-rose-600">{storageService.formatFC(credit.remainingAmount)}</p>
                <p className="text-[9px] text-slate-400 font-black uppercase">Reste à payer</p>
              </div>
            </button>
          ))}
          {filteredCredits.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-300">
               <CheckCircle2 size={48} className="mx-auto mb-4 opacity-10" />
               <p className="font-black text-xs uppercase tracking-widest">Aucun crédit en attente</p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-5">
        {selectedCredit ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest">Fiche Crédit</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase">ID: {selectedCredit.id}</p>
              </div>
              <button onClick={() => setSelectedCredit(null)}><X size={24} /></button>
            </div>

            <div className="p-8 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dette Totale</p>
                     <p className="text-lg font-black text-slate-900">{storageService.formatFC(selectedCredit.remainingAmount)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dernier Versement</p>
                     <p className="text-lg font-black text-slate-900">
                       {selectedCredit.history.length > 0 
                         ? storageService.formatFC(selectedCredit.history[selectedCredit.history.length-1].amount) 
                         : '-'}
                     </p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <History size={14} />
                    <span>Historique des versements</span>
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-2">
                    {selectedCredit.history.map((h, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-[10px] font-bold text-slate-500">{new Date(h.date).toLocaleDateString()}</span>
                         <span className="text-xs font-black text-emerald-600">+{storageService.formatFC(h.amount)}</span>
                      </div>
                    ))}
                    {selectedCredit.history.length === 0 && <p className="text-[10px] text-slate-300 font-bold uppercase text-center py-4">Aucun historique</p>}
                  </div>
               </div>

               <div className="space-y-2 pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Montant du versement</label>
                  <input 
                    type="number" 
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl" 
                    placeholder="0 FC"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                  <button 
                    disabled={paymentAmount <= 0}
                    onClick={handlePayment}
                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50 mt-4"
                  >
                    Enregistrer le paiement
                  </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
             <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-emerald-400 shadow-2xl">
                <Wallet size={40} />
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight">Gestion des Crédits</h3>
                <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto">Sélectionnez un client à gauche pour enregistrer un versement ou voir l'historique de sa dette.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Credits;
