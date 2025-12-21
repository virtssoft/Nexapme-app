
import React, { useState, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem, SaleItem, Sale } from '../types';
import { 
  Search, ShoppingCart, Trash2, ShoppingBag, 
  Printer, Wallet, Plus, Globe, CreditCard, Layers,
  ArrowRight
} from 'lucide-react';
import DocumentPrinter from '../components/DocumentPrinter';

type SaleMode = 'RETAIL' | 'WHOLESALE';

const Sales: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const allStock = storageService.getStock().filter(i => i.quantity > 0);
  
  const [saleMode, setSaleMode] = useState<SaleMode>('RETAIL');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentType, setPaymentType] = useState<Sale['paymentType']>('CASH');
  
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);

  // Filtrage du stock selon le mode
  const displayedStock = useMemo(() => {
    return allStock.filter(item => {
      const matchesMode = saleMode === 'WHOLESALE' ? item.isWholesale : !item.isWholesale;
      const matchesSearch = item.designation.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMode && matchesSearch;
    });
  }, [allStock, saleMode, searchTerm]);

  const total = useMemo(() => cart.reduce((acc, item) => acc + item.total, 0), [cart]);

  const addToCart = (item: StockItem) => {
    const existing = cart.find(c => c.itemId === item.id);
    const price = item.isWholesale ? item.wholesalePrice : item.retailPrice;

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
        isWholesaleApplied: item.isWholesale
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

  const finalizeSale = () => {
    if (cart.length === 0) return;
    const saleId = `FAC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const sale: Sale = {
      id: saleId,
      date: new Date().toISOString(),
      items: cart,
      subtotal: total,
      taxAmount: 0,
      total,
      paymentType,
      customerName: customer.name,
      customerPhone: customer.phone,
      author: storageService.getUser(),
      authorId: storageService.getCurrentUser()?.id || 'system',
      cashAmount: paymentType === 'MIXED' ? cashAmount : (paymentType === 'CASH' ? total : 0),
      creditAmount: paymentType === 'MIXED' ? (total - cashAmount) : (paymentType === 'CREDIT' ? total : 0)
    };
    
    storageService.addSale(sale);
    setLastSale(sale);
    setIsPrinterOpen(true);
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setCashAmount(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 lg:h-[calc(100vh-140px)]">
      {/* Zone Articles */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Toggle Mode Gros/Détail */}
        <div className="bg-white p-1 rounded-3xl border border-slate-200 shadow-sm flex">
          <button 
            onClick={() => { setSaleMode('RETAIL'); setSearchTerm(''); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${saleMode === 'RETAIL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            <ShoppingCart size={16} />
            <span>Vente Détail</span>
          </button>
          <button 
            onClick={() => { setSaleMode('WHOLESALE'); setSearchTerm(''); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${saleMode === 'WHOLESALE' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-600'}`}
          >
            <Layers size={16} />
            <span>Vente Gros</span>
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <Search size={20} className="text-slate-400" />
          <input 
            type="text" 
            placeholder={saleMode === 'RETAIL' ? "Chercher détail..." : "Chercher gros (Sacs, Cartons...)"} 
            className="flex-1 outline-none font-bold text-sm bg-transparent" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 no-scrollbar">
          {displayedStock.map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)} 
              className={`bg-white p-5 rounded-[2rem] border-2 transition-all text-left flex flex-col justify-between h-44 group ${saleMode === 'RETAIL' ? 'border-indigo-50 hover:border-indigo-500' : 'border-emerald-50 hover:border-emerald-500'}`}
            >
              <div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${item.quantity <= item.alertThreshold ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                  Stock: {item.quantity} {item.unit}
                </span>
                <h4 className="font-black text-slate-800 text-xs line-clamp-2 mt-2 leading-tight uppercase">{item.designation}</h4>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className={`font-black text-sm ${saleMode === 'RETAIL' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                  {(item.isWholesale ? item.wholesalePrice : item.retailPrice).toLocaleString()} FC
                </p>
                <div className={`p-2 rounded-full ${saleMode === 'RETAIL' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'} group-hover:scale-110 transition-transform`}>
                  <Plus size={16} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Zone Panier */}
      <div className="lg:col-span-5 flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest">Panier Vente</h3>
          <span className="bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-slate-400">{cart.length} Articles</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200">
              <ShoppingBag size={64} strokeWidth={1} />
              <p className="font-black text-[10px] uppercase mt-4">Caisse vide</p>
            </div>
          ) : cart.map(item => (
            <div key={item.itemId} className={`p-4 rounded-2xl border transition-all ${item.isWholesaleApplied ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-black text-slate-800 text-[11px] uppercase">{item.designation}</p>
                  <p className="text-[9px] text-slate-400 font-bold">{item.unitPrice.toLocaleString()} FC / {item.isWholesaleApplied ? 'Gros' : 'U'}</p>
                </div>
                <button onClick={() => setCart(cart.filter(c => c.itemId !== item.itemId))} className="text-rose-300 hover:text-rose-500"><Trash2 size={16} /></button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center bg-white rounded-xl border border-slate-100">
                  <button onClick={() => adjustQuantity(item.itemId, -1)} className="px-3 py-1.5 font-black text-slate-400">-</button>
                  <span className="px-4 font-black text-xs">{item.quantity}</span>
                  <button onClick={() => adjustQuantity(item.itemId, 1)} className="px-3 py-1.5 font-black text-slate-400">+</button>
                </div>
                <span className="font-black text-slate-900">{item.total.toLocaleString()} FC</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-200 space-y-6">
          <div className="flex justify-between items-end">
             <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Net à Payer</p>
             <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">{total.toLocaleString()} FC</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <button onClick={() => setPaymentType('CASH')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest ${paymentType === 'CASH' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400'}`}>Cash</button>
             <button onClick={() => setPaymentType('MOBILE_MONEY')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest ${paymentType === 'MOBILE_MONEY' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400'}`}>Mobile</button>
             <button onClick={() => setPaymentType('CREDIT')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest ${paymentType === 'CREDIT' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-400'}`}>Crédit</button>
             <button onClick={() => setPaymentType('MIXED')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest ${paymentType === 'MIXED' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-400'}`}>Mixte</button>
          </div>

          <button disabled={cart.length === 0} onClick={finalizeSale} className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-3 transition-all disabled:opacity-50 shadow-xl">
            <Printer size={20} />
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
