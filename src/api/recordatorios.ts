import apiClient from './client';

export enum EstadoRecordatorio {
  Pendiente = 0,
  Contactado = 1,
  NoContestó = 2,
  Descartado = 3,
}

export interface Recordatorio {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteTelefono?: string;
  servicioNombre: string;
  intervaloDias: number;
  estado: EstadoRecordatorio;
  fechaCreacion: string;
  fechaGestion?: string;
  nota?: string;
}

export interface CambiarEstadoDto {
  estado: EstadoRecordatorio;
  nota?: string;
}

export const recordatoriosApi = {
  getAll: async (): Promise<Recordatorio[]> => {
    const response = await apiClient.get<Recordatorio[]>('/recordatorios');
    return response.data;
  },

  cambiarEstado: async (id: number, dto: CambiarEstadoDto): Promise<void> => {
    await apiClient.patch(`/recordatorios/${id}/estado`, dto);
  },
};