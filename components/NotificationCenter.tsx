
import React, { useState, useEffect } from 'react';
import { notificationService, AppNotification } from '../services/NotificationService';
import { Bell, X, AlertTriangle, Info, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    setNotifications(notificationService.getNotifications());
    const interval = setInterval(() => {
      setNotifications(notificationService.getNotifications());
    }, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error': return <AlertCircle className="text-rose-500" size={18} />;
      case 'success': return <CheckCircle className="text-emerald-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white lg:hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-100"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-3 w-[320px] md:w-[400px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-xs">Alertes nexaPME</h3>
              <button onClick={() => setIsOpen(false)}><X size={18} /></button>
            </div>
            <div className="max-h-[400px] overflow-y-auto no-scrollbar p-2">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Bell className="mx-auto mb-2 opacity-20" size={40} />
                  <p className="text-xs font-bold uppercase">Aucune notification</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 hover:bg-slate-50 rounded-2xl flex items-start space-x-4 transition-colors">
                    <div className="mt-1">{getIcon(n.type)}</div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{n.title}</p>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-4 border-t border-slate-50 text-center">
                <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900">
                  Marquer tout comme lu
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
