import React, { useRef } from 'react';
import EmpresaPublicaScreen from '../screens/public/EmpresaPublicaScreen';
import ReservarPublicoScreen from '../screens/public/ReservarPublicoScreen';
import CitaPublicaScreen from '../screens/public/CitaPublicaScreen';
import { reservaDesdeHash } from '../utils/reservasPublicas';
import { empresaDesdeHash } from '../utils/enlacesPublicos';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { analytics } from '../analytics';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { LoadingScreen } from '../components';
import SubscriptionGate from '../components/SubscriptionGate';
import Screen from '../components/Screen';
import {
  flushPendingNotificationNavigation,
  navigationRef,
} from './navigationRef';

export default function RootNavigator({ hashPublico = '' }: { hashPublico?: string }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const currentRouteName = useRef<string | undefined>(undefined);

  const trackCurrentScreen = () => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (name && name !== currentRouteName.current) {
      currentRouteName.current = name;
      analytics.screen(name);
    }
  };

  const handleNavigationReady = () => {
    trackCurrentScreen();
    if (isAuthenticated) flushPendingNotificationNavigation();
  };

  const handleNavigationChange = () => {
    trackCurrentScreen();
    if (isAuthenticated) flushPendingNotificationNavigation();
  };

  const empresaPublicaId = empresaDesdeHash(hashPublico);
  const reserva = reservaDesdeHash(hashPublico);
  if (reserva) return <Screen edges={['top', 'bottom']}>
    {reserva.tipo === 'reservar' ? <ReservarPublicoScreen key={hashPublico} token={reserva.token} empleadoId={reserva.empleadoId} />
      : <CitaPublicaScreen key={hashPublico} token={reserva.token} />}
  </Screen>;
  if (empresaPublicaId !== null) {
    return <Screen edges={['top', 'bottom']}><EmpresaPublicaScreen empresaId={empresaPublicaId}
      onClose={() => { window.location.hash = ''; }} /></Screen>;
  }

  if (isLoading) {
    return <LoadingScreen message="Cargando..." />;
  }

  return (
    <Screen edges={isAuthenticated ? ['bottom'] : ['top', 'bottom']}>

    <NavigationContainer
      ref={navigationRef}
      onReady={handleNavigationReady}
      onStateChange={handleNavigationChange}
    >
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : (
        <SubscriptionGate>
          <AppNavigator />
        </SubscriptionGate>
      )}
    </NavigationContainer>
      </Screen>
  );
}
