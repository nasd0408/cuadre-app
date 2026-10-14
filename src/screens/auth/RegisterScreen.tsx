import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text, Snackbar } from "react-native-paper";
import { authApi } from "../../api/auth";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AuthScaffold from "./AuthScaffold";
import GoogleAuthButton from "./GoogleAuthButton";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { BRAND, INPUT_THEME } from "../../theme/brand";

import { mensajeDeError } from '../../utils/alert';
// La lista de rutas vive en AuthNavigator: mantener una copia local hacía que
// agregar una pantalla compilara en el navegador pero fallara aquí.
type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Register">;
};

export default function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    nombreBarberia: "",
    nombreCompleto: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleRegister = async () => {
    const { nombreBarberia, nombreCompleto, email, password, confirmPassword } = form;

    if (!nombreBarberia.trim() || !nombreCompleto.trim() || !email.trim() ||
        !password.trim() || !confirmPassword.trim()) {
      setError("Por favor completa todos los campos");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Ingresa un correo electrónico válido"); return; }
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }

    setLoading(true);
    setError("");
    try {
      const response = await authApi.registerBusiness({
        nombreBarberia: form.nombreBarberia,
        nombreCompleto: form.nombreCompleto,
        email: form.email,
        password: form.password,
      });
      if (response.requiresEmailConfirmation) {
        navigation.replace("ConfirmEmail", { email: form.email });
      }
    } catch (err: any) {
      setError(mensajeDeError(err, "Error al registrar"));
    } finally {
      setLoading(false);
    }
  };

  const inputProps = {
    mode: "outlined" as const,
    style: styles.input,
    textColor: BRAND.ink,
    outlineColor: BRAND.line,
    activeOutlineColor: BRAND.green,
    theme: INPUT_THEME,
  };

  return (
    <AuthScaffold
      onBack={() => navigation.goBack()}
      heroTitle={"Crea tu espacio\nen Cuadre"}
      heroSubtitle="Gratis para siempre. Organiza tu negocio de belleza hoy."
      formTitle="Crear cuenta"
      formSubtitle="Solo lo básico para empezar."
    >
      <TextInput
        label="Nombre del negocio"
        value={form.nombreBarberia}
        onChangeText={(v) => updateField("nombreBarberia", v)}
        left={<TextInput.Icon icon="storefront-outline" color={BRAND.muted} />}
        {...inputProps}
      />
      <TextInput
        label="Tu nombre completo"
        value={form.nombreCompleto}
        onChangeText={(v) => updateField("nombreCompleto", v)}
        left={<TextInput.Icon icon="account-outline" color={BRAND.muted} />}
        {...inputProps}
      />
      <TextInput
        label="Correo electrónico"
        value={form.email}
        onChangeText={(v) => updateField("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        left={<TextInput.Icon icon="email-outline" color={BRAND.muted} />}
        {...inputProps}
      />
      <TextInput
        label="Contraseña"
        value={form.password}
        onChangeText={(v) => updateField("password", v)}
        secureTextEntry={!showPassword}
        left={<TextInput.Icon icon="lock-outline" color={BRAND.muted} />}
        right={
          <TextInput.Icon
            icon={showPassword ? "eye-off-outline" : "eye-outline"}
            color={BRAND.muted}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        {...inputProps}
      />
      <TextInput
        label="Confirmar contraseña"
        value={form.confirmPassword}
        onChangeText={(v) => updateField("confirmPassword", v)}
        secureTextEntry={!showPassword}
        left={<TextInput.Icon icon="lock-check-outline" color={BRAND.muted} />}
        {...inputProps}
      />

      <Text style={styles.hint}>
        Podrás añadir teléfono, dirección y más desde Configuración.
      </Text>

      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
        buttonColor={BRAND.lime}
        textColor={BRAND.ink}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Crear mi cuenta
      </Button>

      <GoogleAuthButton
        etiqueta="Registrarme con Google"
        deshabilitado={loading}
        onError={setError}
        onRequiereRegistro={(datos) => navigation.navigate("CompletarNegocio", datos)}
      />

      <Button mode="text" onPress={() => navigation.goBack()} textColor={BRAND.green} style={styles.link}>
        Ya tengo cuenta
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
  input: { marginBottom: 12, backgroundColor: BRAND.white },
  hint: { color: BRAND.muted, textAlign: "center", marginTop: 4, marginBottom: 4, fontSize: 12.5 },
  button: { marginTop: 14, borderRadius: 14 },
  buttonContent: { paddingVertical: 9 },
  buttonLabel: { fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },
  link: { marginTop: 8 },
});
