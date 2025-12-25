
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { Credit } from '../types';
import { Search, ChevronRight, CheckCircle2, History, User, Wallet } from 'lucide-react';

const Credits: React.FC = () => {
  const [credits, setCredits] = useState<Credit[]>(storageService.getCredits());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Fetch fresh credits on component mount to populate local cache
  useEffect(() => {
    // Fixed: fetchCredits now correctly returns Promise<Credit[]>
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-7 space-y-4">
        <header>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Crédits Clients</h2>
          <p className="text-slate-5