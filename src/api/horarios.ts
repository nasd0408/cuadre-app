import { apiClient } from './client';

export interface TramoHorario { diaSemana: number; inicioMinuto: number; finMinuto: number }
export interface Horario { activo: boolean; zonaHoraria: string; tramos: TramoHorario[] }
export interface Disponibilidad { horarioConfigurado: boolean; zonaHoraria: string; iniciosUtc: string[] }
export interface AusenciaInput { desde: string; hasta: string; motivo: string | null }
export interface Ausencia extends AusenciaInput { id: number; zonaHoraria: string }

export const horariosApi = {
  async get(id: number): Promise<Horario> { return (await apiClient.get<Horario>(`/empleados/${id}/horario`)).data; },
  async save(id: number, horario: Horario): Promise<Horario> { return (await apiClient.put<Horario>(`/empleados/${id}/horario`, horario)).data; },
  async disponibilidad(id: number, fecha: string, duracionMinutos: number, signal?: AbortSignal): Promise<Disponibilidad> {
    return (await apiClient.get<Disponibilidad>(`/empleados/${id}/horario/disponibilidad`, { params: { fecha, duracionMinutos }, signal })).data;
  },
  async ausencias(id: number): Promise<Ausencia[]> { return (await apiClient.get<Ausencia[]>(`/empleados/${id}/ausencias`)).data; },
  async crearAusencia(id: number, data: AusenciaInput): Promise<Ausencia> { return (await apiClient.post<Ausencia>(`/empleados/${id}/ausencias`, data)).data; },
  async eliminarAusencia(id: number, ausenciaId: number): Promise<void> { await apiClient.delete(`/empleados/${id}/ausencias/${ausenciaId}`); },
};
