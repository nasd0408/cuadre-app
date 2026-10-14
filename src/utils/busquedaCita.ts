import { Cliente, Empleado, Servicio } from "../types";

/**
 * Lógica compartida por los dos modales de acción rápida.
 *
 * `QuickCitaModal` (1093 líneas) y `QuickAgendarModal` (1057) son casi gemelos:
 * comparten catorce funciones con el mismo nombre. Eso no es teoría — el botón
 * de "elegir de contactos" se añadió a uno y se quedó fuera del otro justo por
 * esto.
 *
 * Aquí vive solo la parte **pura**: cálculo y filtrado, sin estado ni React. Es
 * lo que se puede probar sin montar componentes, y lo que de verdad importa que
 * se comporte igual en los dos sitios. El estado y la UI se quedan en cada
 * modal: unificarlos sería un refactor grande de la ruta por la que entra todo
 * el dinero del negocio, y hoy no hay tests de render que lo respalden.
 */

/** Tope de resultados, para no pintar listas enormes mientras se teclea. */
export const MAX_CLIENTES = 10;
export const MAX_EMPLEADOS = 10;
export const MAX_SERVICIOS = 20;

const normalizar = (texto: string) => texto.trim().toLowerCase();

/**
 * Total de los servicios elegidos.
 *
 * Suma el precio una vez por servicio porque los modales siempre envían
 * `cantidad: 1`; si algún día permiten cantidades, esta función es el sitio
 * donde hay que multiplicar y el test que lo fija está al lado.
 */
export function calcularTotal(
  servicios: Servicio[],
  idsSeleccionados: number[],
): number {
  const elegidos = new Set(idsSeleccionados);
  return servicios
    .filter((s) => elegidos.has(s.id))
    .reduce((total, s) => total + s.precio, 0);
}

/** Con la búsqueda vacía se devuelve lista vacía: la UI muestra "recientes". */
export function filtrarClientes(
  clientes: Cliente[],
  query: string,
  max: number = MAX_CLIENTES,
): Cliente[] {
  const q = normalizar(query);
  if (!q) return [];

  return clientes
    .filter(
      (c) =>
        normalizar(c.nombre).includes(q) ||
        // El teléfono se compara sin normalizar a minúsculas, pero sí sin
        // espacios alrededor: buscar "0412" tiene que encontrar al cliente.
        (c.telefono != null && c.telefono.includes(query.trim())),
    )
    .slice(0, max);
}

export function filtrarEmpleados(
  empleados: Empleado[],
  query: string,
  max: number = MAX_EMPLEADOS,
): Empleado[] {
  const q = normalizar(query);
  if (!q) return [];

  return empleados.filter((e) => normalizar(e.nombre).includes(q)).slice(0, max);
}

export function filtrarServicios(
  servicios: Servicio[],
  query: string,
  max: number = MAX_SERVICIOS,
): Servicio[] {
  const q = normalizar(query);
  if (!q) return [];

  return servicios
    .filter(
      (s) =>
        normalizar(s.nombre).includes(q) ||
        // La categoría es opcional en el modelo.
        (s.categoria != null && normalizar(s.categoria).includes(q)),
    )
    .slice(0, max);
}
