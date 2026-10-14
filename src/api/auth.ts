import apiClient from './client';
import {
  AuthResponse,
  LoginDto,
  RegisterBarberiaDto,
  RegisterResponse,
  ConfirmEmailDto,
  ResendCodeDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  MessageResponse,
} from '../types';
import { analytics, AnalyticsEvent } from '../analytics';

/**
 * Respuesta de /auth/google. Si el email no tiene cuenta, el backend no crea nada
 * y pide completar los datos del negocio (que Google no puede aportar).
 */
export type GoogleAuthResult =
  | { tipo: 'autenticado'; auth: AuthResponse }
  | { tipo: 'requiereRegistro'; email: string; nombreCompleto: string };

export interface GoogleRegisterDto {
  idToken: string;
  nombreBarberia: string;
  phoneNumber?: string;
  direccion?: string;
}

export const authApi = {
  // Login
  login: async (credentials: LoginDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Canjea un refresh token por una sesión nueva. Lo usa el login biométrico.
   *
   * Devuelve lo mismo que /auth/login, así que la huella entrega una sesión sin
   * que haya que guardar la contraseña en el dispositivo.
   *
   * OJO: el backend ROTA el token (revoca el usado y emite otro), así que quien
   * llame tiene que guardar el `refreshToken` nuevo o el siguiente intento
   * fallará.
   */
  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Paso 1 de Google: inicia sesión o avisa que falta registrar el negocio
  google: async (idToken: string): Promise<GoogleAuthResult> => {
    const response = await apiClient.post<any>('/auth/google', { idToken });

    if (response.data?.requiresRegistration) {
      return {
        tipo: 'requiereRegistro',
        email: response.data.email ?? '',
        nombreCompleto: response.data.nombreCompleto ?? '',
      };
    }

    return { tipo: 'autenticado', auth: response.data as AuthResponse };
  },

  // Paso 2 de Google: crea el negocio y devuelve la sesión ya iniciada
  googleRegister: async (data: GoogleRegisterDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/google/register', data);
    analytics.track(AnalyticsEvent.SignupSubmitted, { metodo: 'google' });
    return response.data;
  },

  // Register new business
  registerBusiness: async (data: RegisterBarberiaDto): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);
    analytics.track(AnalyticsEvent.SignupSubmitted);
    return response.data;
  },

  // Confirm email with 6-digit code. Devuelve el auth (token) para auto-login;
  // en backends viejos puede venir sin token (se maneja en la pantalla).
  confirmEmail: async (data: ConfirmEmailDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/confirm-email', data);
    analytics.track(AnalyticsEvent.EmailConfirmed);
    return response.data;
  },

  // Resend confirmation code
  resendConfirmation: async (data: ResendCodeDto): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/auth/resend-confirmation', data);
    return response.data;
  },

  // Request password reset code
  forgotPassword: async (data: ForgotPasswordDto): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/auth/forgot-password', data);
    return response.data;
  },

  // Reset password with code
  resetPassword: async (data: ResetPasswordDto): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/auth/reset-password', data);
    return response.data;
  },
};