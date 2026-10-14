import { create, isAxiosError } from 'axios';
import type { PerfilPublico, Sucursal } from './perfilPublico';

export interface EmpresaPublica {
  empresaId: number;
  perfil: PerfilPublico;
  sucursales: Sucursal[];
  tokenReservas?: string | null;
}

// Sin tokens, refresh de sesión ni interceptores de suscripción: la ficha es anónima.
const clientePublico = create({ baseURL: process.env.EXPO_PUBLIC_API_URL, timeout: 15000 });

export async function getEmpresaPublica(id: number, signal?: AbortSignal): Promise<EmpresaPublica | null> {
  try {
    return (await clientePublico.get<EmpresaPublica>(`/publico/empresas/${id}`, { signal })).data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}
