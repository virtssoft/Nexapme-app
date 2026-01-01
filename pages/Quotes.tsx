
import React, { useState, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { Quote, QuoteItem, QuoteStatus } from '../types';
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
      author: storageService.getCurrentUser()?.name || 'system'
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
        <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-6 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center space-x-2 shadow-2xl hover:scale-105 transition-all">
          <Plus size={20} />
          <span>Créer un Devis</span>
        </button>
      </header>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-3">
        <Search size={20} className="text-slate-400" />
        <input type="text" placeholder="Rechercher un client ou un projet..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuotes.map(q => (
          <div key={q.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-200 transition-all overflow-hidden group">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusStyle(q.status)}`}>{q.status}</span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{q.id}</p>
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase text-sm leading-tight group-hover:text-blue-600 transition-colors">{q.title}</h3>
                <p className="text-xs text-slate-500 font-bold flex items-center space-x-1 mt-1"><User size={12} /><span>{q.clientName}</span></p>
              </div>
              <div className="pt-4 border-t border-slate-50 flex justify-between items-end">
                <div>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Devis</p>
                   <p className="font-black text-slate-900 text-lg">{storageService.formatFC(q.total)}</p>
                </div>
                <div className="flex space-x-1">
                  {q.status === 'DRAFT' && <button onClick={() => updateQuoteStatus(q.id, 'SENT')} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><ChevronRight size={16} /></button>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-0 md:p-4 overflow-hidden">
          <div className="bg-white rounded-none md:rounded-[2.5rem] w-full max-w-2xl max-h-screen md:max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-xl text-slate-900"><Calculator size={20} /></div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Nouveau Devis ({step}/4)</h3>
               </div>
               <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Client / Prospect</label>
                    <input type="text" placeholder="Ex: Jean Dupont" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Intitulé du Projet</label>
                    <input type="text" placeholder="Ex: Rénovation Salle de Bain" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center"><h4 className="font-black text-slate-800 uppercase text-xs">Matériaux</h4><button onClick={() => addItem('MATERIAL')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Plus size={18} /></button></div>
                  <div className="space-y-3">
                    {items.filter(i => i.type === 'MATERIAL').map(item => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="col-span-6"><input type="text" placeholder="Détail" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} /></div>
                        <div className="col-span-2"><input type="number" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} /></div>
                        <div className="col-span-3"><input type="number" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} /></div>
                        <div className="col-span-1 flex justify-end"><button onClick={() => removeItem(item.id)} className="text-rose-400"><Trash2 size={16} /></button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                   <div className="flex justify-between items-center"><h4 className="font-black text-slate-800 uppercase text-xs">Main d'œuvre</h4><button onClick={() => addItem('LABOR')} className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Plus size={18} /></button></div>
                   <div className="space-y-3">
                    {items.filter(i => i.type === 'LABOR').map(item => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="col-span-6"><input type="text" placeholder="Prestation" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} /></div>
                        <div className="col-span-2"><input type="number" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} /></div>
                        <div className="col-span-3"><input type="number" className="w-full bg-white px-3 py-2 rounded-lg text-xs font-bold" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} /></div>
                        <div className="col-span-1 flex justify-end"><button onClick={() => removeItem(item.id)} className="text-rose-400"><Trash2 size={16} /></button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-8 animate-in zoom-in-95">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase text-center">Récapitulatif</p>
                    <div className="flex justify-between text-xs font-bold uppercase"><span>Subtotal</span><span>{storageService.formatFC(totals.subtotal)}</span></div>
                    <div className="pt-4 mt-4 border-t-2 border-slate-900 flex justify-between items-end"><span className="text-xs font-black uppercase">TOTAL</span><span className="text-3xl font-black text-slate-900">{storageService.formatFC(totals.total)}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-between shrink-0">
              <button onClick={() => step > 1 ? setStep(step - 1) : setIsModalOpen(false)} className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase"><ChevronLeft size={16} /></button>
              {step < 4 ? (
                <button onClick={() => setStep(step + 1)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Suivant</button>
              ) : (
                <button onClick={handleSaveQuote} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Enregistrer</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
