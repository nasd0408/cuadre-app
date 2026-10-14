import { useCallback, useEffect, useRef } from "react";

/**
 * Evita los dos fallos que tenían las 25 pantallas que cargan datos:
 *
 * 1. **Respuestas obsoletas.** Los filtros de Citas lanzan una petición por
 *    toque. Sin secuencia, gana la que llega antes, no la última pedida: tocas
 *    "hoy" → "semana" → "mes" y puedes acabar viendo los de "hoy".
 *
 * 2. **setState después de desmontar.** Todas hacen `await` y luego escriben
 *    estado, sin comprobar si la pantalla sigue viva. Con `focus` refrescando en
 *    cada entrada, navegar rápido entre pestañas deja respuestas huérfanas.
 *
 * No cancela la petición HTTP: para eso habría que pasar un `AbortSignal` por
 * toda la capa de API. Lo que corrompe la pantalla es escribir el resultado
 * equivocado, y eso es justo lo que se descarta aquí.
 *
 * @example
 * const cargar = useCargaCancelable();
 *
 * const buscar = useCallback(() => {
 *   setLoading(true);
 *   cargar(
 *     () => citasApi.getAll(filtros),
 *     (datos) => { setCitas(datos); setLoading(false); },
 *     (err)   => { setError(mensajeDeError(err, "...")); setLoading(false); },
 *   );
 * }, [filtros, cargar]);
 */
export function useCargaCancelable() {
  // Número de la última carga pedida. Solo esa puede escribir.
  const ultimaPedida = useRef(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  return useCallback(
    async <T,>(
      cargar: () => Promise<T>,
      alTerminar: (dato: T) => void,
      alFallar?: (error: unknown) => void,
    ): Promise<void> => {
      const secuencia = ++ultimaPedida.current;

      // Descarta si la pantalla murió o si ya se pidió algo más nuevo.
      const sigueSiendoValida = () =>
        montado.current && secuencia === ultimaPedida.current;

      try {
        const dato = await cargar();
        if (sigueSiendoValida()) alTerminar(dato);
      } catch (error) {
        if (sigueSiendoValida()) alFallar?.(error);
      }
    },
    [],
  );
}

/**
 * La decisión de "¿puede escribir esta respuesta?", aislada para poder probarla
 * sin montar componentes.
 */
export function respuestaVigente(
  secuencia: number,
  ultimaPedida: number,
  montado: boolean,
): boolean {
  return montado && secuencia === ultimaPedida;
}
