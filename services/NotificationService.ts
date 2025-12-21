
import { storageService } from './StorageService';
import { Operation, Appointment, StockItem } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  date: string;
  read: boolean;
}

class NotificationService {
  private listeners: ((notifications: AppNotification[]) => void)[] = [];

  constructor() {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }

  getNotifications(): AppNotification[] {
    const notifications: AppNotification[] = [];
    const now = new Date();

    // 1. Alertes de Stock
    const stock = storageService.getStock();
    stock.forEach(item => {
      if (item.quantity <= item.alertThreshold) {
        notifications.push({
          id: `stock-${item.id}`,
          title: "Alerte Stock Bas",
          message: `${item.designation} est presque épuisé (${item.quantity} restants).`,
          type: 'warning',
          date: now.toISOString(),
          read: false
        });
      }
    });

    // 2. Alertes Opérations (Échéances)
    const operations = storageService.getOperations();
    operations.forEach(op => {
      if (op.status !== 'COMPLETED' && op.status !== 'DELIVERED' && op.endDate) {
        const endDate = new Date(op.endDate);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 2 && diffDays >= 0) {
          notifications.push({
            id: `op-${op.id}`,
            title: "Échéance Proche",
            message: `L'opération "${op.title}" arrive à échéance dans ${diffDays} jour(s).`,
            type: 'info',
            date: now.toISOString(),
            read: false
          });
        } else if (diffDays < 0) {
          notifications.push({
            id: `op-late-${op.id}`,
            title: "Opération en Retard",
            message: `Le dossier "${op.title}" a dépassé sa date de livraison !`,
            type: 'error',
            date: now.toISOString(),
            read: false
          });
        }
      }
    });

    // 3. Alertes Rendez-vous
    const appointments = storageService.getAppointments();
    appointments.forEach(app => {
      if (app.status === 'SCHEDULED') {
        const appDate = new Date(app.dateTime);
        const diffTime = appDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        if (diffMinutes > 0 && diffMinutes <= 60) {
          notifications.push({
            id: `app-${app.id}`,
            title: "Rendez-vous imminent",
            message: `Client ${app.clientName} attendu dans ${diffMinutes} minutes.`,
            type: 'success',
            date: now.toISOString(),
            read: false
          });
        }
      }
    });

    return notifications;
  }

  sendPush(title: string, body: string) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }
}

export const notificationService = new NotificationService();
