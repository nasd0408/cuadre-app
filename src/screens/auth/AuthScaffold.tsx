import React from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import { Text, IconButton } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { BRAND } from "../../theme/brand";

interface AuthScaffoldProps {
  /** Título grande del hero (blanco sobre verde). */
  heroTitle: string;
  /** Texto secundario del hero. */
  heroSubtitle?: string;
  /** Título dentro de la hoja (paper). */
  formTitle: string;
  formSubtitle?: string;
  /** Contenido del formulario (dentro de la hoja). */
  children: React.ReactNode;
  /** Muestra botón de volver arriba a la izquierda. */
  onBack?: () => void;
}

/**
 * Estructura común de las pantallas de auth: hero verde con marca arriba y una
 * "hoja" paper redondeada abajo con el formulario. Coincide con el login.
 */
export default function AuthScaffold({
  heroTitle,
  heroSubtitle,
  formTitle,
  formSubtitle,
  children,
  onBack,
}: AuthScaffoldProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const styles = makeStyles(isWide);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shell}>
          {/* Hero */}
          <View style={styles.hero}>
            {onBack ? (
              <IconButton
                icon="arrow-left"
                iconColor={BRAND.white}
                size={24}
                onPress={onBack}
                style={styles.back}
              />
            ) : null}

            <View style={styles.brandRow}>
              <Image
                source={require("../../../assets/icon.png")}
                style={styles.logo}
                resizeMode="cover"
              />
              <Text style={styles.brandName}>
                Cuadre<Text style={styles.brandAccent}>APP</Text>
              </Text>
            </View>

            <View style={styles.heroMessage}>
              <Text style={styles.heroTitle}>{heroTitle}</Text>
              {heroSubtitle ? (
                <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
              ) : null}
            </View>
          </View>

          {/* Hoja con el formulario */}
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.formTitle}>{formTitle}</Text>
              {formSubtitle ? (
                <Text style={styles.formSubtitle}>{formSubtitle}</Text>
              ) : null}
            </View>
            <View style={styles.form}>{children}</View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (isWide: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: BRAND.greenDeep },
    scroll: {
      flexGrow: 1,
      justifyContent: isWide ? "center" : "flex-start",
      alignItems: "center",
    },
    shell: {
      width: "100%",
      maxWidth: isWide ? 560 : undefined,
      flex: isWide ? undefined : 1,
      borderRadius: isWide ? 24 : 0,
      overflow: "hidden",
      ...(isWide
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.28,
            shadowRadius: 40,
            elevation: 10,
            marginVertical: 32,
          }
        : {}),
    },
    hero: {
      backgroundColor: BRAND.greenDeep,
      paddingHorizontal: 28,
      paddingTop: isWide ? 40 : 64,
      paddingBottom: 40,
    },
    back: { marginLeft: -8, marginBottom: 4 },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
    logo: { width: 42, height: 42, borderRadius: 12 },
    brandName: { color: BRAND.white, fontSize: 19, fontWeight: "800", letterSpacing: 0.2 },
    brandAccent: { color: BRAND.lime },
    heroMessage: { marginTop: 22 },
    heroTitle: {
      color: BRAND.white,
      fontSize: isWide ? 32 : 28,
      lineHeight: isWide ? 38 : 33,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    heroSubtitle: {
      color: "rgba(255,254,248,0.82)",
      fontSize: 14.5,
      lineHeight: 21,
      marginTop: 10,
      maxWidth: 400,
    },
    sheet: {
      flex: 1,
      backgroundColor: BRAND.paper,
      paddingHorizontal: 26,
      paddingTop: 30,
      paddingBottom: 40,
      borderTopLeftRadius: isWide ? 0 : 28,
      borderTopRightRadius: isWide ? 0 : 28,
      marginTop: isWide ? 0 : -22,
    },
    sheetHeader: { marginBottom: 22 },
    formTitle: {
      color: BRAND.ink,
      fontSize: 21,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    formSubtitle: {
      color: BRAND.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
    },
    form: { width: "100%", maxWidth: 480, alignSelf: "center" },
  });
