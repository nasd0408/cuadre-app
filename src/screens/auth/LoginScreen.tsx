import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  Snackbar,
  useTheme,
  Divider,
  IconButton,
} from "react-native-paper";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuthStore } from "../../stores/authStore";
import { authApi } from "../../api/auth";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { BRAND, INPUT_THEME } from "../../theme/brand";
import GoogleAuthButton from "./GoogleAuthButton";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

import { mensajeDeError } from '../../utils/alert';
// ─── Tipos ────────────────────────────────────────────────────────────────────

// La lista de rutas vive en AuthNavigator: mantener una copia local hacía que
// agregar una pantalla compilara en el navegador pero fallara aquí.
type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Login">;
};

// ─── SecureStore keys ─────────────────────────────────────────────────────────

const KEY_EMAIL   = "biometric_saved_email";
const KEY_ENABLED = "biometric_enabled";

/**
 * Refresh token para el acceso con huella.
 *
 * Antes aquí se guardaba `{email, password}` en claro. SecureStore lo cifra con
 * el Keystore del teléfono, pero una contraseña es una credencial REUTILIZABLE:
 * la gente repite contraseñas, así que filtrarla compromete también su correo y
 * su banco. Un refresh token solo vale para esta app y se puede revocar.
 *
 * La clave es nueva a propósito (no se reutiliza KEY_CREDS): así las
 * instalaciones que ya tenían la contraseña guardada no la leen nunca más, y
 * `limpiarBiometria` la borra en la primera ejecución.
 */
const KEY_REFRESH = "biometric_refresh_token";

/** Clave anterior, solo para poder borrarla. NO se lee. */
const KEY_CREDS_LEGACY = "biometric_saved_credentials";

// ─── Helper storage ───────────────────────────────────────────────────────────

const store = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") return localStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch { return null; }
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") { localStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === "web") { localStorage.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};

// ─── Helpers biometría ────────────────────────────────────────────────────────

async function deviceSupportsBiometric(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled   = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

async function promptBiometric(message: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    fallbackLabel: "Usar contraseña",
    cancelLabel: "Cancelar",
    disableDeviceFallback: false,
  });
  return result.success;
}

// ─── Componente ───────────────────────────────────────────────────────────────

type ScreenMode = "biometric" | "form";

export default function LoginScreen({ navigation }: Props) {
  const setUser        = useAuthStore((state) => state.setUser);
  const { showAlert }  = useConfirmDialog();
  const theme          = useTheme() as any;
  const { width }      = useWindowDimensions();
  const isWide         = width >= 900;
  const styles         = makeStyles(theme, isWide);

  const [mode, setMode]                 = useState<ScreenMode>("form");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [savedEmail, setSavedEmail]     = useState("");

  // ─── Al montar: decidir modo ───────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      // Las instalaciones anteriores guardaban la contraseña en claro. Se borra
      // en cuanto se abre la pantalla, sin esperar a que el usuario haga nada:
      // una credencial reutilizable no debe seguir ahí ni un arranque más.
      await store.del(KEY_CREDS_LEGACY);

      const enabled  = await store.get(KEY_ENABLED);
      const email    = await store.get(KEY_EMAIL);
      const supports = await deviceSupportsBiometric();

      // Si venía de la versión vieja no hay refresh token, así que el acceso
      // rápido no puede funcionar: se muestra el formulario y al entrar con la
      // contraseña se vuelve a ofrecer la biometría, ya con token.
      const tieneToken = (await store.get(KEY_REFRESH)) !== null;

      if (enabled === "true" && email && supports && tieneToken) {
        setSavedEmail(email);
        setMode("biometric");
      }
    };
    init();
  }, []);

  // ─── Login con API ─────────────────────────────────────────────────────────

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await authApi.login({ email: loginEmail, password: loginPassword });

      const alreadyEnabled = await store.get(KEY_ENABLED);
      const supports       = await deviceSupportsBiometric();

      if (supports && alreadyEnabled !== "true") {
        setTimeout(() => {
          showAlert(
            "Acceso rápido con biometría",
            "¿Quieres activar el inicio de sesión con biometría la próxima vez?",
            [
              { text: "Ahora no", style: "cancel" },
              {
                text: "Activar",
                onPress: async () => {
                  // Se guarda el refresh token que acaba de emitir el login, no
                  // la contraseña. Si el backend no lo mandara, no se activa:
                  // mejor sin biometría que con una credencial a medias.
                  if (!response.refreshToken) return;
                  await store.set(KEY_EMAIL, loginEmail);
                  await store.set(KEY_REFRESH, response.refreshToken);
                  await store.set(KEY_ENABLED, "true");
                },
              },
            ]
          );
        }, 500);
      }

      await setUser(response);
    } catch (err: any) {
      const data = err.response?.data;

      if (data?.requiresEmailConfirmation) {
        navigation.navigate("ConfirmEmail", { email: data.email || loginEmail });
        return;
      }

      if (data?.subscriptionExpired) {
        showAlert(
          "Suscripción Expirada",
          "Tu suscripción ha vencido. Contacta con soporte para renovarla.",
          [
            { text: "Cerrar", style: "cancel" },
            { text: "Contactar", onPress: () => navigation.navigate("GestionarCuenta") },
          ]
        );
        return;
      }

      setError(mensajeDeError(err, "Credenciales incorrectas"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      setError("Por favor completa todos los campos");
      return;
    }
    doLogin(email, password);
  };

  const handleBiometricLogin = async () => {
    const ok = await promptBiometric("Confirma tu identidad para ingresar");
    if (!ok) return;

    const refreshToken = await store.get(KEY_REFRESH);
    if (!refreshToken) {
      await disableBiometric();
      setError("Sesión expirada. Por favor ingresa con tu contraseña.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authApi.refresh(refreshToken);

      // El backend ROTA el token: revoca el usado y emite otro. Sin guardar el
      // nuevo, el siguiente acceso con huella fallaría.
      if (response.refreshToken) {
        await store.set(KEY_REFRESH, response.refreshToken);
      }

      await setUser(response);
    } catch {
      // El token caducó o fue revocado (por ejemplo al cerrar sesión en otro
      // sitio). No es un error del usuario: se apaga la biometría y se le pide
      // la contraseña una vez, que es como se vuelve a activar.
      await disableBiometric();
      setError("Tu acceso rápido expiró. Ingresa con tu contraseña para reactivarlo.");
    } finally {
      setLoading(false);
    }
  };

  const disableBiometric = async () => {
    await store.del(KEY_ENABLED);
    await store.del(KEY_EMAIL);
    await store.del(KEY_REFRESH);
    // Instalaciones anteriores tienen aquí la contraseña en claro.
    await store.del(KEY_CREDS_LEGACY);
    setSavedEmail("");
    setEmail("");
    setPassword("");
    setMode("form");
  };

  const brandPanel = (
    <View style={styles.brandPanel}>
      <View style={styles.brandRow}>
        <Image
          source={require("../../../assets/icon.png")}
          style={styles.brandLogo}
          resizeMode="cover"
        />
        <Text style={styles.brandName}>
          Cuadre<Text style={styles.brandAccent}>APP</Text>
        </Text>
      </View>

      <View style={styles.brandMessage}>
        <Text style={styles.brandEyebrow}>GESTIÓN PARA NEGOCIOS DE BELLEZA</Text>
        <Text style={styles.brandTitle}>Tu trabajo fluye.{"\n"}Tus cuentas cuadran.</Text>
        <Text style={styles.brandDescription}>
          Citas, clientes, cobros y equipo en un mismo lugar.
        </Text>
      </View>

      <View style={styles.brandFeatures}>
        <View style={styles.brandFeature}>
          <MaterialCommunityIcons name="calendar-check-outline" size={16} color={BRAND.ink} />
          <Text style={styles.brandFeatureText}>Agenda</Text>
        </View>
        <View style={styles.brandFeature}>
          <MaterialCommunityIcons name="account-cash-outline" size={16} color={BRAND.ink} />
          <Text style={styles.brandFeatureText}>Cobros</Text>
        </View>
        <View style={styles.brandFeature}>
          <MaterialCommunityIcons name="chart-box-outline" size={16} color={BRAND.ink} />
          <Text style={styles.brandFeatureText}>Control</Text>
        </View>
      </View>
    </View>
  );

  // ─── UI: Pantalla biométrica ───────────────────────────────────────────────

  if (mode === "biometric") {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.authShell}>
          {brandPanel}
          <View style={styles.formPanel}>
            <View style={styles.biometricContent}>
              <View style={styles.fingerprintCircle}>
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={44}
                  color={BRAND.green}
                />
              </View>
              <Text variant="headlineMedium" style={styles.formTitle}>
                Qué bueno verte
              </Text>
              <Text variant="bodyMedium" style={styles.formSubtitle}>
                Confirma tu identidad para entrar a tu negocio.
              </Text>
              <View style={styles.accountPill}>
                <MaterialCommunityIcons
                  name="account-circle-outline"
                  size={20}
                  color={BRAND.green}
                />
                <Text variant="bodyMedium" style={styles.savedEmail}>
                  {savedEmail}
                </Text>
              </View>

              <Button
                mode="contained"
                icon="fingerprint"
                onPress={handleBiometricLogin}
                loading={loading}
                disabled={loading}
                buttonColor={BRAND.lime}
                textColor={BRAND.ink}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Entrar con biometría
              </Button>

              <Divider style={styles.divider} />

              <Button
                mode="outlined"
                onPress={() => setMode("form")}
                disabled={loading}
                style={styles.secondaryButton}
                textColor={BRAND.green}
              >
                Usar contraseña
              </Button>

              <Button
                mode="text"
                onPress={disableBiometric}
                disabled={loading}
                textColor={BRAND.muted}
              >
                Entrar con otra cuenta
              </Button>
            </View>
          </View>
        </View>

        <Snackbar
          visible={!!error}
          onDismiss={() => setError("")}
          duration={4000}
          action={{ label: "OK", onPress: () => setError("") }}
        >
          {error}
        </Snackbar>
      </View>
    );
  }

  // ─── UI: Formulario normal ─────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authShell}>
          {brandPanel}
          <View style={styles.formPanel}>
            <View style={styles.formHeader}>
              <Text variant="headlineMedium" style={styles.formTitle}>
                Bienvenido de vuelta
              </Text>
              <Text variant="bodyMedium" style={styles.formSubtitle}>
                Entra para continuar con tu jornada.
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                left={<TextInput.Icon icon="email-outline" color={BRAND.muted} />}
                style={styles.input}
                textColor={BRAND.ink}
                outlineColor={BRAND.line}
                activeOutlineColor={BRAND.green}
                theme={INPUT_THEME}
              />

              <TextInput
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock-outline" color={BRAND.muted} />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off-outline" : "eye-outline"}
                    color={BRAND.muted}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                textColor={BRAND.ink}
                outlineColor={BRAND.line}
                activeOutlineColor={BRAND.green}
                theme={INPUT_THEME}
              />

              <Button
                mode="text"
                onPress={() => navigation.navigate("ForgotPassword")}
                style={styles.forgotButton}
                textColor={BRAND.green}
                compact
              >
                ¿Olvidaste tu contraseña?
              </Button>

              <View style={styles.actionRow}>
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  buttonColor={BRAND.lime}
                  textColor={BRAND.ink}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  Entrar a Cuadre
                </Button>

                {savedEmail ? (
                  <IconButton
                    icon="fingerprint"
                    size={26}
                    mode="contained"
                    onPress={() => setMode("biometric")}
                    disabled={loading}
                    iconColor={BRAND.green}
                    containerColor="rgba(47,111,25,0.10)"
                    style={styles.bioSquare}
                    accessibilityLabel="Entrar con biometría"
                  />
                ) : null}
              </View>

              <GoogleAuthButton
                deshabilitado={loading}
                onError={setError}
                onRequiereRegistro={(datos) =>
                  navigation.navigate("CompletarNegocio", datos)
                }
              />

              {!savedEmail ? (
                <View style={styles.signupRow}>
                  <Text variant="bodyMedium" style={styles.signupText}>
                    ¿Primera vez en Cuadre?
                  </Text>
                  <Button
                    mode="text"
                    onPress={() => navigation.navigate("Register")}
                    textColor={BRAND.green}
                    compact
                  >
                    Crear cuenta
                  </Button>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{ label: "OK", onPress: () => setError("") }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const makeStyles = (theme: any, isWide: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Verde profundo de fondo: en móvil es el "hero"; detrás de la barra de estado.
      backgroundColor: BRAND.greenDeep,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: isWide ? "center" : "flex-start",
      alignItems: "center",
      padding: isWide ? 32 : 0,
    },
    authShell: {
      width: "100%",
      maxWidth: 1120,
      minHeight: isWide ? 680 : undefined,
      flexDirection: isWide ? "row" : "column",
      overflow: "hidden",
      borderRadius: isWide ? 24 : 0,
      backgroundColor: isWide ? BRAND.paper : "transparent",
      ...(isWide
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.28,
            shadowRadius: 40,
            elevation: 10,
          }
        : {}),
    },

    // ── Panel de marca (hero verde) ──
    brandPanel: {
      width: isWide ? "46%" : "100%",
      justifyContent: isWide ? "space-between" : "flex-start",
      paddingHorizontal: isWide ? 44 : 28,
      paddingTop: isWide ? 44 : 24,
      paddingBottom: isWide ? 44 : 34,
      backgroundColor: BRAND.greenDeep,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    brandLogo: {
      width: 44,
      height: 44,
      borderRadius: 12,
    },
    brandName: {
      color: BRAND.white,
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    brandAccent: {
      color: BRAND.lime,
    },
    brandMessage: {
      marginTop: isWide ? 48 : 18,
      marginBottom: isWide ? 48 : 18,
    },
    brandEyebrow: {
      color: BRAND.lime,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginBottom: 14,
    },
    brandTitle: {
      color: BRAND.white,
      fontSize: isWide ? 42 : 32,
      lineHeight: isWide ? 48 : 37,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    brandDescription: {
      color: "rgba(255,254,248,0.82)",
      fontSize: 15,
      lineHeight: 22,
      marginTop: 14,
      maxWidth: 380,
    },
    brandFeatures: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    brandFeature: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: BRAND.lime,
      borderRadius: 999,
    },
    brandFeatureText: {
      color: BRAND.ink,
      fontSize: 12,
      fontWeight: "700",
    },

    // ── Panel del formulario (hoja paper) ──
    formPanel: {
      flex: isWide ? 1 : undefined,
      justifyContent: isWide ? "center" : "flex-start",
      paddingHorizontal: isWide ? 64 : 26,
      paddingTop: isWide ? 56 : 28,
      paddingBottom: isWide ? 56 : 32,
      backgroundColor: BRAND.paper,
      // En móvil la hoja "sube" sobre el hero con esquinas redondeadas.
      ...(isWide
        ? {}
        : {
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            marginTop: -22,
          }),
    },
    formHeader: {
      marginBottom: 24,
    },
    formTitle: {
      color: BRAND.ink,
      fontWeight: "800",
      letterSpacing: -0.3,
      textAlign: isWide ? "left" : "center",
    },
    formSubtitle: {
      color: BRAND.muted,
      marginTop: 6,
      textAlign: isWide ? "left" : "center",
    },
    form: {
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
    },
    input: {
      marginBottom: 14,
      backgroundColor: BRAND.white,
    },
    forgotButton: {
      alignSelf: "flex-end",
      marginTop: -6,
      marginBottom: 12,
    },
    biometricContent: {
      alignItems: "center",
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
      paddingTop: isWide ? 0 : 12,
    },
    savedEmail: {
      flexShrink: 1,
      color: BRAND.ink,
      fontWeight: "600",
    },
    fingerprintCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 22,
      backgroundColor: "rgba(47,111,25,0.12)",
    },
    accountPill: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginTop: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: BRAND.line,
      borderRadius: 14,
      backgroundColor: BRAND.white,
    },
    divider: {
      width: "100%",
      marginVertical: 18,
      backgroundColor: BRAND.line,
    },
    button: {
      width: "100%",
      marginTop: 4,
      borderRadius: 14,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 4,
    },
    loginButton: {
      flex: 1,
      borderRadius: 14,
    },
    bioSquare: {
      width: 52,
      height: 52,
      margin: 0,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BRAND.line,
    },
    buttonContent: {
      paddingVertical: 9,
    },
    buttonLabel: {
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    secondaryButton: {
      width: "100%",
      marginTop: 12,
      borderRadius: 14,
      borderColor: BRAND.line,
    },
    signupRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
    },
    signupText: {
      color: BRAND.muted,
    },
  });
