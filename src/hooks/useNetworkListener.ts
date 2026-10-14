// hooks/useNetworkListener.ts
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useConnectionStore } from '../stores/connectionStore';

export function useNetworkListener() {
  const { connectionError, setConnectionError, clearConnectionError, isOfflineMode } = useConnectionStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // No interrumpir el modo offline
      if (isOfflineMode) return;

      const hasInternet =
        state.isConnected === true && state.isInternetReachable !== false;

      if (!hasInternet) {
        setConnectionError('no_internet');
      } else if (connectionError === 'no_internet') {
        clearConnectionError();
      }
    });

    return () => unsubscribe();
  }, [connectionError, isOfflineMode]);
}
