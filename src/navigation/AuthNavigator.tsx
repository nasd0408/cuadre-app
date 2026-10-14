import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ConfirmEmailScreen from '../screens/auth/ConfirmEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import CompletarNegocioScreen from '../screens/auth/CompletarNegocioScreen';
import GestionarCuentaScreen from '../screens/restriction/GestionarCuentaScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ConfirmEmail: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  /** Segundo paso del registro con Google: faltan los datos del negocio. */
  CompletarNegocio: { idToken: string; email: string; nombreCompleto: string };
  GestionarCuenta: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
    
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
    
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="CompletarNegocio" component={CompletarNegocioScreen} />
      <Stack.Screen 
        name="GestionarCuenta" 
        component={GestionarCuentaScreen} 
        options={{ title: "Gestionar Cuenta" }} 
      />
    </Stack.Navigator>
  );
}