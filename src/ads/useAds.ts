// Ciclo de vida de los anuncios: hidratación de topes, inicialización perezosa
// del SDK y disparo del App Open. Se monta una sola vez desde App.tsx.
//
// No importa el SDK directamente (lo hace a través de ./index, que en web es un
// stub), así que este archivo también compila en el bundle web.
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { usePlanStore } from "../stores/planStore";
import { initAds, showAppOpenIfAllowed } from "./index";
import { useAdsStore } from "./adsStore";

/** Tiempo mínimo en segundo plano para que volver cuente como "nueva apertura". */
const MS_MINIMO_BACKGROUND = 30 * 1000;

/** Margen para que la pantalla ya tenga contenido antes de tapar con un App Open. */
const MS_ESPERA_CONTENIDO = 1500;

/**
 * Marca de "ya usó la app al menos una vez". Los anuncios App Open no se muestran
 * en el primer arranque tras instalar: chocan con el onboarding y son motivo de
 * rechazo en la revisión de Play.
 */
const MS_HASTA_MARCAR_PRIMER_ARRANQUE = 5000;

export function useAds(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mostrarAnuncios = usePlanStore((s) => s.plan?.mostrarAnuncios ?? false);

  const sdkIniciado = useRef(false);
  const enBackgroundDesde = useRef<number | null>(null);

  useEffect(() => {
    useAdsStore.getState().hydrate();

    const timer = setTimeout(() => {
      useAdsStore.getState().marcarPrimerArranque();
    }, MS_HASTA_MARCAR_PRIMER_ARRANQUE);

    return () => clearTimeout(timer);
  }, []);

  // El SDK se inicializa solo cuando hace falta: arrancarlo para un usuario de
  // plan pago sería gastar batería y red en algo que nunca va a mostrar nada.
  useEffect(() => {
    if (!isAuthenticated || !mostrarAnuncios || sdkIniciado.current) return;

    sdkIniciado.current = true;

    let temporizador: ReturnType<typeof setTimeout> | undefined;

    initAds()
      .then(() => {
        // Intento de App Open en arranque en frío. Se hace con retardo para que la
        // pantalla ya tenga contenido detrás (política de Play: nunca sobre el splash).
        temporizador = setTimeout(() => {
          showAppOpenIfAllowed();
        }, MS_ESPERA_CONTENIDO);
      })
      // Sin catch, un fallo de initAds (SDK ausente, sin red) era una promesa
      // rechazada sin manejar que solo recogia el handler global.
      .catch(() => {});

    // El timer vivia dentro del .then, fuera de cualquier limpieza: si el usuario
    // cerraba sesion en esos segundos, saltaba un anuncio sobre la pantalla de
    // login.
    return () => {
      if (temporizador) clearTimeout(temporizador);
    };
  }, [isAuthenticated, mostrarAnuncios]);

  // App Open al volver del segundo plano.
  useEffect(() => {
    const onChange = (estado: AppStateStatus) => {
      if (estado === "background") {
        enBackgroundDesde.current = Date.now();
        return;
      }

      if (estado !== "active") return;

      const desde = enBackgroundDesde.current;
      enBackgroundDesde.current = null;

      // Volver de una llamada corta o de la bandeja de notificaciones no cuenta.
      if (desde && Date.now() - desde >= MS_MINIMO_BACKGROUND) {
        showAppOpenIfAllowed();
      }
    };

    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  }, []);
}
