import { Linking } from "react-native";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { usePlanStore } from "../stores/planStore";
import { analytics, AnalyticsEvent } from "../analytics";

export const LANDING_PLANES_URL = "https://cuadreapp.duckdns.org/#planes";

export type MotivoUpgrade =
  | {
      tipo: "modulo";
      modulo: "pagos" | "reportes" | "recordatorios" | "calendario";
      nombre: string;
    }
  | {
      tipo: "limite";
      recurso: "servicios" | "empleados";
      max: number;
    };

/**
 * Punto único donde se le ofrece al usuario mejorar de plan.
 *
 * Antes cada bloqueo terminaba en un callejón sin salida: una alerta con un solo
 * botón "Entendido", o directamente un FAB deshabilitado sin explicación. Como el
 * plan Gratis existe precisamente para convertir, cada tope tiene que ser una
 * puerta hacia los planes, no un muro.
 *
 * Además centraliza el tracking, que es lo que permitirá saber qué límite es el
 * que realmente empuja a pagar.
 */
export function useUpgradePrompt() {
  const { showAlert } = useConfirmDialog();
  const plan = usePlanStore((s) => s.plan);
  const getLimiteTexto = usePlanStore((s) => s.getLimiteTexto);

  const pedirUpgrade = (motivo: MotivoUpgrade) => {
    const planActual = plan?.planNombre ?? "actual";

    const { titulo, mensaje, origen } =
      motivo.tipo === "modulo"
        ? {
            titulo: motivo.nombre,
            mensaje:
              `${getLimiteTexto(motivo.modulo)}.\n\n` +
              `Estás en el plan ${planActual}.`,
            origen: `modulo_${motivo.modulo}`,
          }
        : {
            titulo: `Llegaste al límite de ${motivo.recurso}`,
            mensaje:
              `El plan ${planActual} permite hasta ${motivo.max} ${motivo.recurso}.\n\n` +
              `Con un plan pago tienes más, sin anuncios y con acceso a la versión web.`,
            origen: `limite_${motivo.recurso}`,
          };

    analytics.track(AnalyticsEvent.UpgradePromptShown, { origen, plan: planActual });

    showAlert(titulo, mensaje, [
      { text: "Ahora no", style: "cancel" },
      {
        text: "Ver planes",
        onPress: () => {
          analytics.track(AnalyticsEvent.UpgradeCtaClicked, { origen, plan: planActual });
          Linking.openURL(LANDING_PLANES_URL);
        },
      },
    ]);
  };

  return { pedirUpgrade };
}
