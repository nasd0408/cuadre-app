import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { usePlanStore } from '../stores/planStore';
import GestionarCuentaScreen from '../screens/restriction/GestionarCuentaScreen';
import WebSoloPagosScreen from '../screens/restriction/WebSoloPagosScreen';
import MorosoWarningModal from './MorosoWarningModal';
import Screen from './Screen';

const SuspendedStack = createNativeStackNavigator();

interface Props {
  children: React.ReactNode;
}

/**
 * SubscriptionGate - Wraps the main app and handles subscription states
 *
 * - Activo: Shows children normally
 * - Moroso: Shows children + warning modal (dismissible) + persistent banner
 * - Suspendido: Shows GestionarCuenta + RegistrarPago (mini navigator)
 */
export default function SubscriptionGate({ children }: Props) {
  const theme = useTheme() as any;
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { status, isLoading: subLoading, checkStatus } = useSubscriptionStore();
  const plan = usePlanStore((state) => state.plan);

  useEffect(() => {
    if (isAuthenticated) {
      checkStatus();
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (subLoading && !status) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // WEB + plan sin acceso web (Gratis) — la web es beneficio de plan pago.
  // Se evalúa solo cuando el plan ya cargó: si es null, no se bloquea a nadie
  // por un cache frío.
  if (Platform.OS === 'web' && plan && !plan.accesoWeb) {
    return (
      <Screen edges={['top']} sinAnuncios>
        <WebSoloPagosScreen />
      </Screen>
    );
  }

  // SUSPENDIDO — mini navigator with renewal + payment screens
  if (status?.estado === 'Suspendido') {
    return (
      <Screen edges={['top']} sinAnuncios>
      <SuspendedStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.onPrimary },
          headerTintColor: theme.colors.primary,
        }}
      >
        <SuspendedStack.Screen
          name="GestionarCuenta"
          component={GestionarCuentaScreen}
          options={{ headerShown: false, title: 'Gestionar Cuenta' }}
        />

      </SuspendedStack.Navigator>
      </Screen>
    );
  }

  // ACTIVO or MOROSO
  return (
    <>
      {children}
      <MorosoWarningModal />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});