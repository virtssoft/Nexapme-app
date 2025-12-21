
import React, { useState, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem } from '../types';
import { CATEGORIES } from '../constants';
import { 
  Search, Plus, Edit2, Trash2, X, Scissors, Info, Save, Filter, 
  Layers, Package, TrendingUp, AlertCircle, ShoppingCart, ArrowRightLeft,
  ArrowRight, Calculator, PlusCircle
} from 'lucide-react';
import Branding from '../components/Branding';

type StockFilter = 'ALL' | 'WHOLESALE' | 'RETAIL';

const Stock: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const currentUser = storageService.getCurrentUser();
  const isManager = currentUser?.role === 'MANAGER';

  const [stock, setStock] = useState<StockItem[]>(storageService.getStock());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<StockFilter>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  
  // Edit form state
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState<Partial<StockItem>>({ 
    category: CATEGORIES[0], 
    isWholesale: false,
    unit: 'Unité',
    quantity: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    purchasePrice: 0,
    alertThreshold: 5
  });

  // Split logic state
  const [splitSource, setSplitSource] = useState<StockItem | null>(null);
  const [splitTargetId, setSplitTargetId] = useState<string>('');
  const [splitQty, setSplitQty] = useState<number>(1);
  const [splitFactor, setSplitFactor] = useState<number>(25);

  const filteredStock = useMemo(() => {
    return stock.filter(item => {
      const matchesSearch = item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTypeFilter = activeFilter === 'ALL' ? true : 
                         activeFilter === 'WHOLESALE' ? item.isWholesale : !item.isWholesale;
      
      const matchesCategory = selectedCategory === 'ALL' ? true : item.category === selectedCategory;

      return matchesSearch && matchesTypeFilter && matchesCategory;
    });
  }, [stock, searchTerm, activeFilter, selectedCategory]);

  const stats = useMemo(() => {
    const wholesaleVal = stock.filter(i => i.isWholesale).reduce((acc, i) => acc + (i.quantity * i.purchasePrice), 0);
    const retailVal = stock.filter(i => !i.isWholesale).reduce((acc, i) => acc + (i.quantity * i.purchasePrice), 0);
    const lowStock = stock.filter(i => i.quantity <= i.alertThreshold).length;
    return { wholesaleVal, retailVal, lowStock };
  }, [stock]);

  const handleSave = () => {
    if (!formData.designation || !isManager) return;
    
    const newQuantity = Number(formData.quantity) || 0;
    const oldQuantity = editingItem ? editingItem.quantity : 0;
    const purchasePrice = Number(formData.purchasePrice) || 0;

    const itemToSave: StockItem = {
      id: editingItem?.id || Math.random().toString(36).substr(2, 9),
      designation: formData.designation || '',
      quantity: newQuantity,
      unit: formData.unit || 'Kg',
      retailPrice: Number(formData.retailPrice) || 0,
      wholesalePrice: Number(formData.wholesalePrice) || 0,
      wholesaleThreshold: Number(formData.wholesaleThreshold) || 0,
      purchasePrice: purchasePrice,
      alertThreshold: Number(formData.alertThreshold) || 5,
      category: formData.category || CATEGORIES[0],
      subCategory: formData.subCategory, 
      expiryDate: formData.expiryDate,
      isWholesale: formData.isWholesale || false
    };

    if (newQuantity > oldQuantity && purchasePrice > 0) {
      const addedQty = newQuantity - oldQuantity;
      const expense = addedQty * purchasePrice;
      storageService.recordCashFlow(expense, 'OUT', 'Achat Stock', `Approvisionnement: ${addedQty} ${itemToSave.unit} de ${itemToSave.designation}`);
    }

    const newStockList = editingItem 
      ? stock.map(s => s.id === editingItem.id ? itemToSave : s)
      : [itemToSave, ...stock];

    setStock(newStockList);
    storageService.updateStock(newStockList);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSplit = () => {
    if (!splitSource || !splitTargetId || splitQty <= 0 || !isManager) return;
    
    storageService.splitStockItem(splitSource.id, splitTargetId, splitQty, splitFactor);
    setStock(storageService.getStock());
    setIsSplitModalOpen(false);
    setSplitSource(null);
    setSplitQty(1);
    setSplitTargetId('');
    
    // Notification de succès visuelle simple
    alert(`Transfert réussi : ${splitQty} ${splitSource.unit} transformés en ${splitQty * splitFactor} unités de détail.`);
  };

  const handleDelete = (id: string) => {
    if (!isManager) return;
    if (confirm("Confirmer la suppression définitive ?")) {
      const updatedStock = stock.filter(item => item.id !== id);
      setStock(updatedStock);
      storageService.updateStock(updatedStock);
    }
  };

  const openNewRetailItemFromSplit = () => {
    setIsSplitModalOpen(false);
    setEditingItem(null);
    setFormData({ 
      category: splitSource?.category || CATEGORIES[0], 
      isWholesale: false, 
      unit: 'Unité', 
      quantity: 0, 
      retailPrice: 0, 
      wholesalePrice: 0, 
      purchasePrice: 0, 
      alertThreshold: 5 
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 no-print">
        <Branding companyName={config?.name || ''} category={isManager ? "Contrôle d'Inventaire" : "Consultation Stock"} size="lg" variant="light" />
        
        <div className="flex w-full md:w-auto gap-3">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex flex-1 md:flex-none">
            <button onClick={() => setActiveFilter('ALL')} className={`flex-1 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeFilter === 'ALL' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Tous</button>
            <button onClick={() => setActiveFilter('WHOLESALE')} className={`flex-1 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeFilter === 'WHOLESALE' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>Gros</button>
            <button onClick={() => setActiveFilter('RETAIL')} className={`flex-1 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeFilter === 'RETAIL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Détail</button>
          </div>
          
          {isManager && (
            <button onClick={() => { setEditingItem(null); setFormData({ category: CATEGORIES[0], isWholesale: activeFilter === 'WHOLESALE', unit: activeFilter === 'WHOLESALE' ? 'Sac' : 'Unité', quantity: 0, retailPrice: 0, wholesalePrice: 0, purchasePrice: 0, alertThreshold: 5 }); setIsModalOpen(true); }} 
              className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center space-x-2">
              <Plus size={20} />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          )}
        </div>
      </header>

      {/* Barre de Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valeur Stock Gros</p>
            <p className="text-xl font-black text-emerald-900">{storageService.formatFC(stats.wholesaleVal)}</p>
          </div>
          <Layers className="text-emerald-200" size={32} />
        </div>
        <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Valeur Stock Détail</p>
            <p className="text-xl font-black text-indigo-900">{storageService.formatFC(stats.retailVal)}</p>
          </div>
          <ShoppingCart className="text-indigo-200" size={32} />
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertes Stock</p>
            <p className={`text-xl font-black ${stats.lowStock > 0 ? 'text-rose-500' : 'text-slate-900'}`}>{stats.lowStock} Articles</p>
          </div>
          <AlertCircle className={stats.lowStock > 0 ? 'text-rose-200' : 'text-slate-100'} size={32} />
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
          <Search size={20} className="text-slate-400" />
          <input type="text" placeholder="Rechercher par nom..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          <button onClick={() => setSelectedCategory('ALL')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase whitespace-nowrap border transition-all ${selectedCategory === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>Toutes</button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase whitespace-nowrap border transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Liste des Cartes Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStock.map(item => {
          const isLow = item.quantity <= item.alertThreshold;
          return (
            <div key={item.id} className={`bg-white rounded-[2.5rem] border transition-all group relative overflow-hidden flex flex-col h-full ${isLow ? 'border-rose-300 ring-2 ring-rose-50' : 'border-slate-100 hover:border-slate-300 shadow-sm'}`}>
              <div className={`h-24 p-6 flex justify-between items-start ${item.isWholesale ? 'bg-emerald-50/50' : 'bg-indigo-50/50'}`}>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.isWholesale ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
                  {item.isWholesale ? 'GROS' : 'DÉTAIL'}
                </span>
                
                {isManager && (
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.isWholesale && (
                      <button onClick={() => { setSplitSource(item); setSplitQty(1); setSplitTargetId(''); setIsSplitModalOpen(true); }} className="p-2 bg-white text-emerald-600 rounded-xl shadow-sm border border-emerald-100 hover:scale-110" title="Scinder vers le détail"><Scissors size={16} /></button>
                    )}
                    <button onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} className="p-2 bg-white text-blue-600 rounded-xl shadow-sm border border-blue-100 hover:scale-110"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-white text-rose-600 rounded-xl shadow-sm border border-rose-100 hover:scale-110"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 -mt-6 flex-1 flex flex-col">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 mb-4 flex-1">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{item.category}</p>
                  <h3 className="font-black text-slate-800 uppercase text-sm leading-tight mb-4 min-h-[2.5rem] line-clamp-2">{item.designation}</h3>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">En Stock</p>
                      <p className={`text-3xl font-black tracking-tighter ${isLow ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
                        {item.quantity} <span className="text-xs text-slate-400">{item.unit}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-2xl border ${item.isWholesale ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Prix Vente</p>
                    <p className={`text-lg font-black ${item.isWholesale ? 'text-emerald-700' : 'text-indigo-700'}`}>
                      {item.isWholesale ? (item.wholesalePrice || 0).toLocaleString() : (item.retailPrice || 0).toLocaleString()} <span className="text-[10px]">FC</span>
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-white border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Prix Achat (U)</p>
                    <p className="text-lg font-black text-slate-400">{(item.purchasePrice || 0).toLocaleString()} <span className="text-[10px]">FC</span></p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALE DE SCISSION (GROS VERS DÉTAIL) */}
      {isSplitModalOpen && splitSource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden border border-white/20">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-500 rounded-2xl text-slate-900"><ArrowRightLeft size={24} /></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">Transformation de Stock</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Du Gros vers le Détail</p>
                </div>
              </div>
              <button onClick={() => setIsSplitModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* Flux Visuel */}
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative">
                <div className="text-center flex-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Source (Gros)</p>
                  <div className="px-4 py-2 bg-white rounded-xl border border-emerald-200 inline-block">
                    <p className="font-black text-slate-800 text-xs">{splitSource.designation}</p>
                    <p className="text-[10px] font-bold text-emerald-600">{splitSource.quantity} {splitSource.unit}</p>
                  </div>
                </div>
                <div className="px-4 text-emerald-300 animate-pulse"><ArrowRight size={32} /></div>
                <div className="text-center flex-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Cible (Détail)</p>
                  {splitTargetId ? (
                    <div className="px-4 py-2 bg-white rounded-xl border border-indigo-200 inline-block">
                      <p className="font-black text-slate-800 text-xs">{stock.find(s => s.id === splitTargetId)?.designation}</p>
                      <p className="text-[10px] font-bold text-indigo-600">Article Prêt</p>
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-slate-100 rounded-xl border border-dashed border-slate-300 inline-block">
                      <p className="text-[10px] font-black text-slate-400 italic">En attente...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-2">1. Sélectionner l'article de détail</label>
                    <select 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500"
                      value={splitTargetId}
                      onChange={(e) => setSplitTargetId(e.target.value)}
                    >
                      <option value="">Choisir un article...</option>
                      {stock.filter(s => !s.isWholesale && s.category === splitSource.category).map(s => (
                        <option key={s.id} value={s.id}>{s.designation} ({s.unit})</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={openNewRetailItemFromSplit}
                    className="w-full py-3 px-4 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center space-x-2 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <PlusCircle size={14} />
                    <span>Créer un nouvel article de détail</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-2">Qté à scinder</label>
                      <input 
                        type="number" 
                        min="1"
                        max={splitSource.quantity}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-emerald-600"
                        value={splitQty}
                        onChange={(e) => setSplitQty(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-2">Unités / {splitSource.unit}</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-indigo-600"
                        value={splitFactor}
                        onChange={(e) => setSplitFactor(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-900 rounded-2xl text-center space-y-1 border border-slate-800">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aperçu du résultat</p>
                    <div className="flex items-center justify-center space-x-3">
                      <span className="text-xl font-black text-emerald-400">-{splitQty} Gros</span>
                      <ArrowRight size={14} className="text-slate-600" />
                      <span className="text-xl font-black text-indigo-400">+{splitQty * splitFactor} Détail</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <button 
                disabled={!splitTargetId || splitQty <= 0 || splitQty > splitSource.quantity}
                onClick={handleSplit}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 flex items-center justify-center space-x-3 disabled:opacity-50 transition-all"
              >
                <Calculator size={18} />
                <span>Valider la Transformation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'Édition/Ajout (inchangée mais nécessaire pour la création rapide) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className={`p-8 text-white flex justify-between items-center ${formData.isWholesale ? 'bg-emerald-600' : 'bg-slate-900'}`}>
              <h3 className="font-black uppercase tracking-widest text-xs">{editingItem ? 'Modifier' : 'Nouveau'} Produit</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setFormData({...formData, isWholesale: false, unit: 'Unité'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!formData.isWholesale ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Détail</button>
                <button onClick={() => setFormData({...formData, isWholesale: true, unit: 'Sac'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isWholesale ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Gros</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Désignation</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.designation || ''} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Catégorie</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Quantité</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.quantity || 0} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Unité</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.unit || ''} onChange={(e) => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">P. Achat (U)</label>
                  <input type="number" className="w-full p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl font-bold text-rose-700" value={formData.purchasePrice || 0} onChange={(e) => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Seuil Alerte</label>
                  <input type="number" className="w-full p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl font-bold text-rose-700" value={formData.alertThreshold || 5} onChange={(e) => setFormData({...formData, alertThreshold: Number(e.target.value)})} />
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Paramètres de Vente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-2">{formData.isWholesale ? 'Prix de Gros' : 'Prix de Vente Unitaire'}</label>
                      <input type="number" className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-emerald-600" value={formData.isWholesale ? formData.wholesalePrice : formData.retailPrice} onChange={(e) => setFormData({...formData, [formData.isWholesale ? 'wholesalePrice' : 'retailPrice']: Number(e.target.value)})} />
                   </div>
                   {!formData.isWholesale && (
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase px-2">Seuil Prix Gros</label>
                        <input type="number" className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-blue-600" value={formData.wholesaleThreshold || 0} onChange={(e) => setFormData({...formData, wholesaleThreshold: Number(e.target.value)})} />
                     </div>
                   )}
                </div>
              </div>

              <button onClick={handleSave} className={`w-full py-5 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 transition-all ${formData.isWholesale ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-900 hover:bg-black'}`}>
                <Save size={20} />
                <span>Enregistrer le Produit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
