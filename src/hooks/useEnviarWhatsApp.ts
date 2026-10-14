import { useConfirmDialog } from "../components/ConfirmDialog";
import { openWhatsApp, WhatsAppApp } from "../utils/whatsapp";

type AppConcreta = Exclude<WhatsAppApp, "ask">;

const NOMBRE: Record<AppConcreta, string> = {
  business: "WhatsApp Business",
  personal: "WhatsApp",
};

interface EnviarOptions {
  telefono: string;
  codigoPais: string;
  mensaje: string;
  /** Preferencia guardada en la configuración de mensajería. */
  preferencia: WhatsAppApp;
}

/**
 * Envío por WhatsApp respetando la preferencia del negocio.
 *
 * Dos reglas de diseño, aprendidas de los fallos anteriores:
 *
 *  1. "Preguntar cada vez" pregunta de verdad, con un diálogo de la app. Antes
 *     caía a un esquema `whatsapp://` que Android resolvía solo, así que la
 *     opción no hacía nada de lo que prometía.
 *
 *  2. Que la app preferida no esté no es un error que merezca interrumpir. La
 *     mayoría de la gente tiene solo WhatsApp normal, y el valor por defecto de
 *     la configuración es Business: avisar de eso en cada mensaje sería un
 *     diálogo constante por una situación perfectamente normal. Se abre la otra
 *     y punto. Solo se avisa si no hay ningún WhatsApp.
 */
export function useEnviarWhatsApp() {
  const { showAlert } = useConfirmDialog();

  const abrir = async (opts: Omit<EnviarOptions, "preferencia">, app: AppConcreta) => {
    const resultado = await openWhatsApp({ ...opts, app });

    if (resultado.estado === "abierto") return;

    showAlert(
      "No se pudo abrir WhatsApp",
      "No encontramos WhatsApp instalado en este teléfono.",
      [{ text: "Entendido", style: "cancel" }],
    );
  };

  const enviar = async ({ preferencia, ...opts }: EnviarOptions) => {
    if (preferencia !== "ask") {
      await abrir(opts, preferencia);
      return;
    }

    showAlert("¿Con cuál quieres abrirlo?", "Elige la aplicación para enviar el mensaje.", [
      { text: "Cancelar", style: "cancel" },
      { text: NOMBRE.personal, onPress: () => abrir(opts, "personal") },
      { text: NOMBRE.business, onPress: () => abrir(opts, "business") },
    ]);
  };

  return { enviar };
}
