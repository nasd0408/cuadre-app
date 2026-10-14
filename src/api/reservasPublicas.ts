import { create } from 'axios';
import type { Sucursal } from './perfilPublico';

export interface ProfesionalPublico { id: number; nombre: string; zonaHoraria: string }
export interface ServicioPublico { id: number; nombre: string; duracionMinutos: number; precio: number }
export interface CatalogoReservas {
  nombre: string; descripcion: string | null; telefono: string | null; local: Sucursal;
  profesionales: ProfesionalPublico[]; servicios: ServicioPublico[];
}
export interface DisponibilidadPublica { horarioConfigurado: boolean; zonaHoraria: string; iniciosUtc: string[] }
export interface CrearReservaPublica {
  solicitudToken: string; empleadoId: number; servicioId: number; inicioUtc: string;
  nombre: string; telefono: string; email: string | null;
}
export interface ConfirmacionReserva {
  negocio: string; profesional: string; zonaHoraria: string; nombreCliente: string; inicioUtc: string;
  estado: string; puedeCancelar: boolean; local: string; direccion: string | null;
  telefonoNegocio: string | null; servicios: ServicioPublico[];
}

// Las peticiones públicas no llevan la sesión del administrador ni renuevan JWT.
const cliente = create({ baseURL: process.env.EXPO_PUBLIC_API_URL, timeout: 15000 });
export const reservasPublicasApi = {
  async catalogo(token: string, signal?: AbortSignal): Promise<CatalogoReservas> {
    return (await cliente.get(`/publico/reservas/${token}`, { signal })).data;
  },
  async disponibilidad(token: string, empleadoId: number, servicioId: number, fecha: string, signal?: AbortSignal): Promise<DisponibilidadPublica> {
    return (await cliente.get(`/publico/reservas/${token}/disponibilidad`, { params: { empleadoId, servicioId, fecha }, signal })).data;
  },
  async crear(token: string, data: CrearReservaPublica): Promise<ConfirmacionReserva> {
    return (await cliente.post(`/publico/reservas/${token}`, data)).data;
  },
  async cita(token: string, signal?: AbortSignal): Promise<ConfirmacionReserva> {
    return (await cliente.get(`/publico/reservas/cita/${token}`, { signal })).data;
  },
  async cancelar(token: string): Promise<ConfirmacionReserva> {
    return (await cliente.post(`/publico/reservas/cita/${token}/cancelar`)).data;
  },
};
