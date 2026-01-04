
import React, { useState, useMemo, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem, SaleItem, Sale } from '../types';
import { 
  Search, ShoppingCart, Trash2, ShoppingBag, 
  Printer, Plus, Layers, Loader2, RefreshCw, Banknote, CreditCard
} from 'lucide-react';
import DocumentPrinter from '../components/DocumentPrinter';

type SaleMode = 'RETAIL' | 'WHOLESALE';

const Sales: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const [allStock, setAllStock] = useState<StockItem[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  const [saleMode, setSaleMode] = useState<SaleMode>('RETAIL');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentType, setPaymentType] = useState<Sale['paymentType']>('CASH');
  
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);

  const loadStock = async () => {
    setIsLoadingStock(true);
    try {
      const stock = await storageService.fetchStock();
      setAllStock(stock.filter(i => (i.quantity || 0) > 0));
    } catch (e) {
      console.error("Stock load failed");
    } finally {
      setIsLoadingStock(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const displayedStock = useMemo(() => {
    return allStock.filter(item => 
      (item.designation || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allStock, searchTerm]);

  const total = useMemo(() => cart.reduce((acc, item) => acc + (item.total || 0), 0), [cart]);

  const addToCart = (item: StockItem) => {
    const existing = cart.find(c => c.itemId === item.id);
    const price = saleMode === 'WHOLESALE' ? item.wholesalePrice : item.retailPrice;

    if (existing) {
      if (existing.quantity + 1 > item.quantity) {
        alert("Stock insuffisant !");
        return;
      }
      setCart(cart.map(c => c.itemId === item.id ? { 
        ...c, 
        quantity: c.quantity + 1, 
        total: (c.quantity + 1) * price 
      } : c));
    } else {
      setCart([...cart, { 
        itemId: item.id, 
        designation: item.designation, 
        quantity: 1, 
        unitPrice: price, 
        total: price,
        isWholesaleApplied: saleMode === 'WHOLESALE'
      }]);
    }
  };

  const adjustQuantity = (itemId: string, delta: number) => {
    const itemInStock = allStock.find(s => s.id === itemId);
    if (!itemInStock) return;

    setCart(cart.map(c => {
      if (c.itemId === itemId) {
        const newQty = Math.max(1, c.quantity + delta);
        if (newQty > itemInStock.quantity) return c;
        return { ...c, quantity: newQty, total: newQty * c.unitPrice };
      }
      return c;
    }));
  };

  const generateFactureID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `FAC-${result}`;
  };

  const finalizeSale = async () => {
    if (cart.length === 0 || isFinalizing) return;
    
    if (paymentType === 'MIXED' && (cashAmount > total || cashAmount < 0)) {
      alert("Montant cash invalide.");
      return;
    }

    if ((paymentType === 'CREDIT' || paymentType === 'MIXED') && !customer.name) {
      alert("Le nom du client est requis pour les ventes à crédit ou mixtes.");
      return;
    }

    setIsFinalizing(true);
    const sale: Sale = {
      id: generateFactureID(),
      date: new Date().toISOString(),
      items: cart,
      subtotal: total,
      taxAmount: 0,
      total,
      paymentType,
      customerName: customer.name || 'Client Comptant',
      customerPhone: customer.phone,
      author: storageService.getCurrentUser()?.name || 'Vendeur',
      authorId: storageService.getCurrentUser()?.id || '',
      cashAmount: paymentType === 'MIXED' ? cashAmount : (paymentType === 'CASH' ? total : 0),
      creditAmount: paymentType === 'MIXED' ? (total - cashAmount) : (paymentType === 'CREDIT' ? total : 0)
    };
    
    try {
      await storageService.addSale(sale);
      setLastSale(sale);
      setIsPrinterOpen(true);
      setCart([]);
      setCustomer({ name: '', phone: '' });
      setCashAmount(0);
      setPaymentType('CASH');
      await loadStock();
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 lg:h-[calc(100vh-140px)]">
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="bg-white p-1 rounded-3xl border border-slate-200 shadow-sm flex shrink-0">
          <button 
            onClick={() => setSaleMode('RETAIL')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${saleMode === 'RETAIL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            Mode Détail
          </button>
          <button 
            onClick={() => setSaleMode('WHOLESALE')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${saleMode === 'WHOLESALE' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-600'}`}
          >
            Mode Gros
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-3 shrink-0">
          <Search size={20} className="text-slate-400" />
          <input type="text" placeholder="Rechercher un produit..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={loadStock} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><RefreshCw size={16} className={isLoadingStock ? 'animate-spin' : ''} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 no-scrollbar min-h-0">
          {displayedStock.map(item => (
            <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 hover:border-emerald-500 transition-all text-left flex flex-col justify-between h-44 group">
              <div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${item.quantity <= item.alertThreshold ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                  {item.quantity} {item.unit}
                </span>
                <h4 className="font-bold text-slate-800 text-xs line-clamp-2 mt-2 leading-tight uppercase">{item.designation}</h4>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-black text-[11px] text-slate-900">{(saleMode === 'WHOLESALE' ? item.wholesalePrice : item.retailPrice).toLocaleString()} FC</p>
                <Plus size={16} className="text-emerald-600" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest">Panier</h3>
          <span className="text-[10px] font-black text-slate-400">{cart.length} Articles</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {cart.map(item => (
            <div key={item.itemId} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-[11px] uppercase line-clamp-1">{item.designation}</p>
                <div className="flex items-center space-x-4 mt-2">
                   <div className="flex bg-white rounded-lg border border-slate-100 overflow-hidden">
                      <button onClick={() => adjustQuantity(item.itemId, -1)} className="px-2 py-1 text-slate-400 hover:bg-slate-50">-</button>
                      <span className="px-3 py-1 text-[10px] font-black">{item.quantity}</span>
                      <button onClick={() => adjustQuantity(item.itemId, 1)} className="px-2 py-1 text-slate-400 hover:bg-slate-50">+</button>
                   </div>
                   <span className="text-[10px] font-black">{(item.total || 0).toLocaleString()} FC</span>
                </div>
              </div>
              <button onClick={() => setCart(cart.filter(c => c.itemId !== item.itemId))} className="text-rose-300 hover:text-rose-500 ml-4"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-200 space-y-6">
          <div className="flex justify-between items-end">
             <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Total Net</p>
             <h2 className="text-3xl font-black text-emerald-600">{(total || 0).toLocaleString()} FC</h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
             <button onClick={() => setPaymentType('CASH')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase transition-all ${paymentType === 'CASH' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400'}`}>Cash</button>
             <button onClick={() => setPaymentType('CREDIT')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase transition-all ${paymentType === 'CREDIT' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-400'}`}>Crédit</button>
             <button onClick={() => setPaymentType('MIXED')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase transition-all ${paymentType === 'MIXED' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-400'}`}>Mixte</button>
          </div>

          {(paymentType === 'MIXED') && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase px-2">Montant Payé en Cash</label>
                <input type="number" className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl font-black text-xl text-emerald-600 outline-none" placeholder="0 FC" value={cashAmount || ''} onChange={(e) => setCashAmount(Number(e.target.value))} />
              </div>
              <p className="text-[9px] font-black text-rose-500 uppercase px-2">Reste en Crédit : {(total - cashAmount).toLocaleString()} FC</p>
            </div>
          )}

          <input type="text" placeholder="Nom du Client (Requis pour crédit)" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold" value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} />

          <button 
            disabled={cart.length === 0 || isFinalizing} 
            onClick={finalizeSale} 
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
          >
            {isFinalizing ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20} />}
            <span>Valider la Vente</span>
          </button>
        </div>
      </div>

      {isPrinterOpen && lastSale && config && (
        <DocumentPrinter sale={lastSale} config={config} onClose={() => setIsPrinterOpen(false)} />
      )}
    </div>
  );
};

export default Sales;
