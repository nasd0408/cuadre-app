import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AuthScaffold from "./AuthScaffold";
import { BRAND, INPUT_THEME } from "../../theme/brand";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../stores/authStore";
import { cerrarSesionGoogle } from "../../auth/google";
import { AuthStackParamList } from "../../navigation/AuthNavigator";

type Ruta = RouteProp<AuthStackParamList, "CompletarNegocio">;

/**
 * Segundo paso del registro con Google.
 *
 * Google entrega email y nombre, pero no el nombre del negocio ni el teléfono,
 * que la empresa necesita. Se piden aquí, en el mínimo de campos posible: la
 * dirección se deja para Ajustes porque no bloquea nada.
 */
export default function CompletarNegocioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { idToken, email, nombreCompleto } = useRoute<Ruta>().params;
  const setUser = useAuthStore((s) => s.setUser);

  const [nombreBarberia, setNombreBarberia] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const nombreValido = nombreBarberia.trim().length >= 3;

  const handleCrear = async () => {
    if (!nombreValido) {
      setError("El nombre del negocio debe tener al menos 3 caracteres.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const auth = await authApi.googleRegister({
        idToken,
        nombreBarberia: nombreBarberia.trim(),
        phoneNumber: telefono.trim() || undefined,
      });

      await setUser(auth);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "No pudimos crear tu negocio. Intenta de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  };

  const handleVolver = async () => {
    // Si vuelve atrás sin terminar, se cierra la sesión de Google para que el
    // próximo intento vuelva a preguntar la cuenta en vez de reusar esta.
    await cerrarSesionGoogle();
    navigation.goBack();
  };

  return (
    <AuthScaffold
      heroTitle={`Un paso más${nombreCompleto ? `, ${nombreCompleto.split(" ")[0]}` : ""}`}
      heroSubtitle="Solo falta saber cómo se llama tu negocio."
      formTitle="Tu negocio"
      formSubtitle="Podrás cambiar estos datos cuando quieras desde Ajustes."
      onBack={handleVolver}
    >
      <View style={styles.cuentaPill}>
        <Text style={styles.cuentaTexto} numberOfLines={1}>
          {email}
        </Text>
      </View>

      <TextInput
        label="Nombre del negocio"
        value={nombreBarberia}
        onChangeText={setNombreBarberia}
        mode="outlined"
        autoCapitalize="words"
        maxLength={100}
        disabled={cargando}
        style={styles.input}
        textColor={BRAND.ink}
        outlineColor={BRAND.line}
        activeOutlineColor={BRAND.green}
        theme={INPUT_THEME}
      />
      <HelperText type="info" visible={!nombreValido && nombreBarberia.length > 0}>
        Mínimo 3 caracteres.
      </HelperText>

      <TextInput
        label="Teléfono (opcional)"
        value={telefono}
        onChangeText={setTelefono}
        mode="outlined"
        keyboardType="phone-pad"
        disabled={cargando}
        style={styles.input}
        textColor={BRAND.ink}
        outlineColor={BRAND.line}
        activeOutlineColor={BRAND.green}
        theme={INPUT_THEME}
      />

      <Button
        mode="contained"
        onPress={handleCrear}
        loading={cargando}
        disabled={cargando || !nombreValido}
        buttonColor={BRAND.lime}
        textColor={BRAND.ink}
        style={styles.boton}
        contentStyle={styles.botonContenido}
        labelStyle={styles.botonEtiqueta}
      >
        Crear mi negocio
      </Button>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{ label: "OK", onPress: () => setError("") }}
      >
        {error}
      </Snackbar>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  cuentaPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderRadius: 999,
    backgroundColor: "rgba(47,111,25,0.10)",
  },
  cuentaTexto: { color: BRAND.green, fontWeight: "600" },
  input: { backgroundColor: BRAND.white },
  boton: { marginTop: 10, borderRadius: 12 },
  botonContenido: { height: 52 },
  botonEtiqueta: { fontSize: 16, fontWeight: "700" },
});
