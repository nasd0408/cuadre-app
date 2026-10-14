import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { analytics, AnalyticsEvent } from "../analytics";
import { BANNER_UNIT_ID } from "./adUnitIds";
import { getAdsSdk } from "./sdk";
import { useAdsStore } from "./adsStore";
import { usePlanStore } from "../stores/planStore";

/**
 * Banner adaptativo anclado al fondo de la pantalla.
 *
 * Reserva su altura desde el primer render aunque el anuncio no cargue (sin red,
 * sin inventario, cuenta AdMob recién creada). Si el contenedor creciera al
 * llegar el anuncio, la lista de abajo daría un salto justo cuando el usuario
 * está tocando algo.
 */
const ALTURA_BANNER = 50;
const REINTENTO_MS = 60 * 1000;

export default function AdBanner() {
  const [falló, setFalló] = useState(false);

  // Hay que suscribirse a planStore ADEMÁS de a adsStore. La decisión vive en
  // adsStore, pero depende del plan, y el plan se carga después del login: sin
  // esta suscripción el componente no se entera de que llegó y el banner no
  // aparece nunca (adsStore no emite cuando cambia planStore).
  const plan = usePlanStore((s) => s.plan);
  const permitidoPorTopes = useAdsStore((s) => s.puedeMostrarBanner());

  // require diferido: en Expo Go no hay módulo nativo y un import estático
  // tumbaría la app entera al arrancar.
  const sdk = getAdsSdk();

  // Un fallo de inventario o de red no debe ocultar el banner durante toda la
  // sesión. Se desmonta un minuto y después se permite un intento limpio.
  useEffect(() => {
    if (!falló) return;
    const timer = setTimeout(() => setFalló(false), REINTENTO_MS);
    return () => clearTimeout(timer);
  }, [falló]);

  if (!plan || !permitidoPorTopes || falló || !sdk) return null;

  const { BannerAd, BannerAdSize } = sdk;

  return (
    <View style={styles.contenedor}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => analytics.track(AnalyticsEvent.AdImpression, { formato: "banner" })}
        onAdFailedToLoad={() => setFalló(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    height: ALTURA_BANNER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
