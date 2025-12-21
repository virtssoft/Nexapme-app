
import React, { useState, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { Quote, QuoteItem, QuoteStatus } from '../types';
// Added Info to the import list
import { 
  FileText, Plus, Search, Hammer, Package, Calculator, 
  ChevronRight, ChevronLeft, Save, Trash2, X, CheckCircle, 
  Clock, AlertCircle, TrendingUp, User, Calendar, Info
} from 'lucide-react';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>(storageService.getQuotes());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Form State
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [marginPercentage, setMarginPercentage] = useState(20);

  // Calculation memo
  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const marginAmount = (subtotal * marginPercentage) / 100;
    const total = subtotal + marginAmount;
    return { subtotal, marginAmount, total };
  }, [items, marginPercentage]);

  const filteredQuotes = quotes.filter(q => 
    q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = (type: 'MATERIAL' | 'LABOR') => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSaveQuote = () => {
    if (!clientName || !title) {
      alert("Veuillez remplir le client et l'intitulé.");
      return;
    }

    const newQuote: Quote = {
      id: `QT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      clientName,
      title,
      date: new Date().toISOString(),
      items,
      marginPercentage,
      subtotal: totals.subtotal,
      marginAmount: totals.marginAmount,
      total: totals.total,
      status: 'DRAFT',
      author: storageService.getUser()
    };

    const updated = [newQuote, ...quotes];
    setQuotes(updated);
    storageService.saveQuotes(updated);
    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setStep(1);
    setClientName('');
    setTitle('');
    setItems([]);
    setMarginPercentage(20);
  };

  const updateQuoteStatus = (id: string, status: QuoteStatus) => {
    const updated = quotes.map(q => q.id === id ? { ...q, status } : q);
    setQuotes(updated);
    storageService.saveQuotes(updated);
  };

  const getStatusStyle = (status: QuoteStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-600';
      case 'SENT': return 'bg-blue-100 text-blue-600';
      case 'ACCEPTED': return 'bg-emerald-100 text-emerald-600';
      case 'REFUSED': return 'bg-rose-100 text-rose-600';
      default: return 'bg-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase flex items-center space-x-3">
            <FileText size={32} className="text-blue-500" />
            <span>Gestion des Devis</span>
          </h2>
          <p className="text-slate-500 font-medium italic">Estimez vos chantiers et services avec précision</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center space-x-2 shadow-2xl hover:scale-105 transition-all"
        >
          <Plus size={20} />
          <span>Créer un Devis</span>
        </button>
      </header>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-3">
        <Search size={20} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Rechercher un client ou un projet..."
          className="flex-1 outline-none font-bold text-sm bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid of Quotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuotes.map(q => (
          <div key={q.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-200 transition-all overflow-hidden group">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusStyle(q.status)}`}>
                  {q.status}
                </span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{q.id}</p>
              </div>
              
              <div>
                <h3 className="font-black text-slate-800 uppercase text-sm leading-tight group-hover:text-blue-600 transition-colors">{q.title}</h3>
                <p className="text-xs text-slate-500 font-bold flex items-center space-x-1 mt-1">
                  <User size={12} />
                  <span>{q.clientName}</span>
                </p>
                <p className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 mt-1">
                   <Calendar size={10} />
                   <span>Fait le {new Date(q.date).toLocaleDateString()}</span>
                </p>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-between items-end">
                <div>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Devis</p>
                   <p className="font-black text-slate-900 text-lg">{storageService.formatFC(q.total)}</p>
                </div>
                <div className="flex space-x-1">
                  {q.status === 'DRAFT' && (
                    <button onClick={() => updateQuoteStatus(q.id, 'SENT')} title="Marquer comme envoyé" className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><ChevronRight size={16} /></button>
                  )}
                  {q.status === 'SENT' && (
                    <button onClick={() => updateQuoteStatus(q.id, 'ACCEPTED')} title="Accepter" className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle size={16} /></button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredQuotes.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
             <FileText className="mx-auto mb-4 text-slate-200" size={48} />
             <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Aucun devis trouvé</p>
          </div>
        )}
      </div>

      {/* Multi-step Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center rounded-t-[2.5rem]">
               <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-xl text-slate-900"><Calculator size={20} /></div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Nouveau Devis nexaPME</h3>
                    <div className="flex space-x-1 mt-1">
                      {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-1 w-8 rounded-full ${step >= s ? 'bg-blue-500' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
               </div>
               <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center space-x-4">
                    <Info size={24} className="text-blue-500" />
                    <p className="text-xs font-bold text-blue-700 uppercase">Commencez par définir les informations générales du projet.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Client / Prospect</label>
                    <input type="text" placeholder="Ex: Jean Dupont" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-blue-500 outline-none" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Intitulé du Projet</label>
                    <input type="text" placeholder="Ex: Rénovation Salle de Bain" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-blue-500 outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center space-x-2">
                      <Package size={16} className="text-emerald-500" />
                      <span>Matériaux & Fournitures</span>
                    </h4>
                    <button onClick={() => addItem('MATERIAL')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {items.filter(i => i.type === 'MATERIAL').map(item => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="col-span-6"><input type="text" placeholder="Description" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold outline-none" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} /></div>
                        <div className="col-span-2"><input type="number" placeholder="Qté" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold outline-none text-center" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} /></div>
                        <div className="col-span-3"><input type="number" placeholder="P.U." className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold outline-none text-right" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} /></div>
                        <div className="col-span-1 flex justify-end"><button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button></div>
                      </div>
                    ))}
                    {items.filter(i => i.type === 'MATERIAL').length === 0 && <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic">Aucun matériau ajouté</p>}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center space-x-2">
                        <Hammer size={16} className="text-amber-500" />
                        <span>Main d'œuvre & Prestations</span>
                      </h4>
                      <button onClick={() => addItem('LABOR')} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all">
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {items.filter(i => i.type === 'LABOR').map(item => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div className="col-span-6"><input type="text" placeholder="Service / Temps" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold outline-none" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} /></div>
                          <div className="col-span-2"><input type="number" placeholder="H" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold outline-none text-center" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} /></div>
                          <div className="col-span-3"><input type="number" placeholder="Taux H." className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold outline-none text-right" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} /></div>
                          <div className="col-span-1 flex justify-end"><button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button></div>
                        </div>
                      ))}
                      {items.filter(i => i.type === 'LABOR').length === 0 && <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic">Aucune main d'œuvre ajoutée</p>}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 text-white rounded-[2rem] space-y-4">
                    <div className="flex justify-between items-center">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Marge bénéficiaire (%)</p>
                       <span className="text-xl font-black text-emerald-400">{marginPercentage}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      value={marginPercentage}
                      onChange={(e) => setMarginPercentage(Number(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter pt-2 border-t border-slate-800">
                       <span>Minimum</span>
                       <span>Standard (20%)</span>
                       <span>Maximum</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 animate-in zoom-in-95">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-6">
                    <div className="text-center pb-4 border-b border-slate-200">
                      <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{title}</h4>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-1">Client: {clientName}</p>
                    </div>
                    
                    <div className="space-y-3">
                       <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                          <span>Sous-total HT</span>
                          <span>{storageService.formatFC(totals.subtotal)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm font-black text-emerald-600 uppercase tracking-widest">
                          <span>Marge ({marginPercentage}%)</span>
                          <span>+ {storageService.formatFC(totals.marginAmount)}</span>
                       </div>
                       <div className="pt-4 mt-4 border-t-2 border-slate-900 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">TOTAL DEVIS</span>
                          <div className="text-right">
                            <p className="text-3xl font-black text-slate-900">{storageService.formatFC(totals.total)}</p>
                            <p className="text-sm font-bold text-slate-400 italic">({storageService.formatUSD(totals.total)})</p>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-2xl flex items-center space-x-3 text-blue-700">
                      <Clock size={20} />
                      <p className="text-[10px] font-black uppercase">Statut initial: BROUILLON</p>
                    </div>
                    <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center space-x-3">
                      <User size={20} className="text-blue-500" />
                      <p className="text-[10px] font-black uppercase truncate">Auteur: {storageService.getUser()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-between items-center rounded-b-[2.5rem]">
              <button 
                onClick={() => step > 1 ? setStep(step - 1) : setIsModalOpen(false)}
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2"
              >
                <ChevronLeft size={16} />
                <span>{step === 1 ? 'Annuler' : 'Retour'}</span>
              </button>

              {step < 4 ? (
                <button 
                  onClick={() => setStep(step + 1)}
                  className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2 shadow-xl hover:scale-105 transition-all"
                >
                  <span>Suivant</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button 
                  onClick={handleSaveQuote}
                  className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2 shadow-xl hover:scale-105 transition-all"
                >
                  <Save size={16} />
                  <span>Enregistrer le Devis</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
