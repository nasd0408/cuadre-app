import { create } from 'zustand';
import { subscriptionApi, SubscriptionStatus } from '../api/suscripcion';

import { analytics } from '../analytics';
interface SubscriptionState {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  showMorosoWarning: boolean;
  lastChecked: Date | null;

  // Actions
  checkStatus: () => Promise<void>;
  dismissMorosoWarning: () => void;
  clearStatus: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  status: null,
  isLoading: false,
  showMorosoWarning: false,
  lastChecked: null,

  checkStatus: async () => {
    set({ isLoading: true });
    
    try {
      const status = await subscriptionApi.getStatus();
      
      set({
        status,
        isLoading: false,
        lastChecked: new Date(),
        // Show warning if moroso and not dismissed in this session
        showMorosoWarning: status.estado === 'Moroso',
      });
    } catch (error) {
      analytics.captureError(error, { origen: 'subscriptionStore', detalle: 'Error checking subscription status:' });
      set({ isLoading: false });
    }
  },

  dismissMorosoWarning: () => {
    set({ showMorosoWarning: false });
  },

  clearStatus: () => {
    set({
      status: null,
      isLoading: false,
      showMorosoWarning: false,
      lastChecked: null,
    });
  },
}));