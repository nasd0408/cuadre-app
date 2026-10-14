import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Divider, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND } from "../../theme/brand";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../stores/authStore";
import { GoogleCancelado, googleDisponible, obtenerIdTokenGoogle } from "../../auth/google";

interface Props {
  /** Se llama cuando el correo no tiene cuenta y hay que pedir los datos del negocio. */
  onRequiereRegistro: (datos: {
    idToken: string;
    email: string;
    nombreCompleto: string;
  }) => void;
  onError: (mensaje: string) => void;
  deshabilitado?: boolean;
  /** Texto del botón: cambia entre la pantalla de login y la de registro. */
  etiqueta?: string;
}

/**
 * Botón "Continuar con Google" compartido por Login y Registro.
 *
 * No se renderiza si no hay client ID configurado (o en web): más vale no mostrar
 * el botón que mostrar uno que falla siempre.
 */
export default function GoogleAuthButton({
  onRequiereRegistro,
  onError,
  deshabilitado = false,
  etiqueta = "Continuar con Google",
}: Props) {
  const [cargando, setCargando] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  if (!googleDisponible()) return null;

  const handlePress = async () => {
    setCargando(true);
    try {
      const idToken = await obtenerIdTokenGoogle();
      const resultado = await authApi.google(idToken);

      if (resultado.tipo === "requiereRegistro") {
        onRequiereRegistro({
          idToken,
          email: resultado.email,
          nombreCompleto: resultado.nombreCompleto,
        });
        return;
      }

      await setUser(resultado.auth);
    } catch (err: any) {
      // Cerrar el diálogo es una decisión del usuario, no un error que reportar.
      if (err instanceof GoogleCancelado) return;

      onError(
        err.response?.data?.message ||
          err.message ||
          "No pudimos iniciar sesión con Google.",
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.separadorFila}>
        <Divider style={styles.separadorLinea} />
        <Text style={styles.separadorTexto}>o</Text>
        <Divider style={styles.separadorLinea} />
      </View>

      <Button
        mode="outlined"
        onPress={handlePress}
        loading={cargando}
        disabled={cargando || deshabilitado}
        textColor={BRAND.ink}
        style={styles.boton}
        contentStyle={styles.botonContenido}
        labelStyle={styles.botonEtiqueta}
        icon={({ size }) => (
          <MaterialCommunityIcons name="google" size={size} color="#4285F4" />
        )}
      >
        {etiqueta}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 18 },
  separadorFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  separadorLinea: { flex: 1, backgroundColor: BRAND.line },
  separadorTexto: { color: BRAND.muted, fontSize: 13 },
  boton: { borderRadius: 12, borderColor: BRAND.line },
  botonContenido: { height: 50 },
  botonEtiqueta: { fontSize: 15, fontWeight: "600" },
});
