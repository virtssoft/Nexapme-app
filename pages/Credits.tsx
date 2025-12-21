
import React, { useState } from 'react';
import { storageService } from '../services/StorageService';
import { Credit } from '../types';
import { Search, ChevronRight, CheckCircle2, History, User, Wallet } from 'lucide-react';

const Credits: React.FC = () => {
  const [credits, setCredits] = useState<Credit[]>(storageService.getCredits());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const filteredCredits = credits.filter(c => 
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) && c.status === 'PENDING'
  );

  const handlePayment = () => {
    if (!selectedCredit || paymentAmount <= 0) return;
    
    storageService.repayCredit(selectedCredit.id, paymentAmount);
    setCredits(storageService.getCredits()); // Refresh local state
    
    setSelectedCredit(null);
    setPaymentAmount(0);
    alert("Paiement enregistré ! Le montant a été ajouté à votre Journal de Caisse.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-7 space-y-4">
        <header>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Crédits Clients</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Suivi des dettes et recouvrements</p>
        </header>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <Search size={20} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher un client débiteur..."
            className="flex-1 outline-none bg-transparent font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {filteredCredits.map(credit => (
            <button 
              key={credit.id}
              onClick={() => setSelectedCredit(credit)}
              className={`w-full text-left bg-white p-5 rounded-2xl border transition-all flex items-center justify-between ${selectedCredit?.id === credit.id ? 'border-rose-500 ring-2 ring-rose-500/10 shadow-lg' : 'border-slate-100 hover:border-slate-300'}`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                  <User size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-xs">{credit.customerName}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Depuis le {new Date(credit.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right flex items-center space-x-4">
                <div>
                  <p className="text-rose-600 font-black text-lg">{credit.remainingAmount.toLocaleString()} FC</p>
                  <p className="text-[9px] text-slate-300 font-black uppercase tracking-tighter">Dette Initiale: {credit.initialAmount.toLocaleString()} FC</p>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </div>
            </button>
          ))}
          {filteredCredits.length === 0 && (
            <div className="py-20 text-center text-slate-400 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
              <CheckCircle2 size={48} className="mx-auto mb-4 opacity-10" />
              <p className="font-black text-[10px] uppercase tracking-widest">Aucun crédit client en cours</p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-5">
        {selectedCredit ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden sticky top-6 animate-in slide-in-from-right-4 duration-500">
            <div className="p-8 bg-slate-900 text-white">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-2">Fiche Débiteur</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedCredit.customerName}</h3>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100">
                  <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-1">Reste à Payer</p>
                  <p className="text-xl font-black text-rose-600">{selectedCredit.remainingAmount.toLocaleString()} FC</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
                  <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Total Versé</p>
                  <p className="text-xl font-black text-emerald-600">{(selectedCredit.initialAmount - selectedCredit.remainingAmount).toLocaleString()} FC</p>
                </div>
              </div>

              <div>
                <h4 className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  <History size={14} />
                  <span>Historique des Versements</span>
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                  {selectedCredit.history.map((h, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase">{new Date(h.date).toLocaleDateString()}</span>
                      <span className="font-black text-slate-800">+{h.amount.toLocaleString()} FC</span>
                    </div>
                  ))}
                  {selectedCredit.history.length === 0 && <p className="text-[10px] italic text-slate-300 text-center py-4">Aucun versement effectué</p>}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">Enregistrer un versement</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      type="number" 
                      placeholder="Montant à payer"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 outline-none font-black text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    />
                  </div>
                  <button 
                    onClick={handlePayment}
                    disabled={paymentAmount <= 0}
                    className="bg-emerald-600 text-white px-8 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-xl"
                  >
                    Valider
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[500px] bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 p-10 text-center">
            <User size={64} className="mb-4 opacity-10" />
            <p className="font-black text-[10px] uppercase tracking-widest leading-relaxed">
              Sélectionnez un dossier client dans la liste pour enregistrer un remboursement ou consulter l'historique
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Credits;
