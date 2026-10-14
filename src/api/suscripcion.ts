import { CreatePagoSuscripcionDto, PagoSuscripcion, RegistrarPagoResponse } from '../types';
import apiClient from './client';
import { analytics, AnalyticsEvent } from '../analytics';

export interface SubscriptionStatus {
  estado: 'Activo' | 'Moroso' | 'Suspendido';
  estadoCodigo: number;
  empresaNombre: string;
  fechaVencimiento: string | null;
  fechaBloqueo: string | null;
  diasHastaVencimiento: number | null;
  diasHastaBloqueo: number | null;
  mensaje: string;
  puedeOperar: boolean;
}

export const subscriptionApi = {
  getStatus: async (): Promise<SubscriptionStatus> => {
    const response = await apiClient.get<SubscriptionStatus>('/subscription/status');
    return response.data;
  },
   registrarPago: async (data: CreatePagoSuscripcionDto): Promise<RegistrarPagoResponse> => {
    const response = await apiClient.post<RegistrarPagoResponse>(
      '/PagosSuscripcion/registrar',
      data
    );
    analytics.track(AnalyticsEvent.SubscriptionPaymentSubmitted, {
      plan: data.planSolicitado,
      metodoPago: data.metodoPago,
    });
    return response.data;
  },

  // Admin gets their own payment history
  getMisPagos: async (): Promise<PagoSuscripcion[]> => {
    const response = await apiClient.get<PagoSuscripcion[]>(
      '/PagosSuscripcion/mis-pagos'
    );
    return response.data;
  },

  // SuperAdmin gets all pending payments
  getPagosPendientes: async (): Promise<PagoSuscripcion[]> => {
    const response = await apiClient.get<PagoSuscripcion[]>(
      '/PagosSuscripcion/pendientes'
    );
    return response.data;
  },

  // SuperAdmin approves or rejects a payment
  validarPago: async (id: number, nuevoEstado: 'Aprobado' | 'Rechazado'): Promise<void> => {
    await apiClient.put(`/PagosSuscripcion/validar/${id}`, JSON.stringify(nuevoEstado), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};