import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { Text, Button, Surface } from "react-native-paper";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountStatusWarningModal() {
  const { status, showMorosoWarning, dismissMorosoWarning } =
    useSubscriptionStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  if (!showMorosoWarning || status?.estado !== "Moroso") {
    return null;
  }

  const diasRestantes = status.diasHastaBloqueo ?? 0;

  return (
    <Modal
      visible={showMorosoWarning}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismissMorosoWarning}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom", "left", "right"]}
      >
        <Pressable style={styles.overlay} onPress={dismissMorosoWarning}>
          <Pressable
            style={styles.cardWrapper}
            onPress={(e) => e.stopPropagation()}
          >
            <Surface style={styles.card} elevation={4}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>⚠️</Text>
            </View>

            <Text variant="headlineSmall" style={styles.title}>
              Estado de cuenta
            </Text>

            <Text variant="bodyLarge" style={styles.empresaName}>
              {status.empresaNombre}
            </Text>

            {/* Ya no se suspende a nadie por no pagar: la cuenta baja al plan
                Gratis. Advertir con un corte de acceso que no va a ocurrir asusta
                sin motivo y quema la confianza cuando el usuario descubre que era
                falso. */}
            <View style={styles.warningBox}>
              {diasRestantes > 0 ? (
                <>
                  <Text variant="bodyMedium" style={styles.warningText}>
                    Tu suscripción venció. En
                  </Text>
                  <Text variant="headlineMedium" style={styles.daysCount}>
                    {diasRestantes} {diasRestantes === 1 ? "día" : "días"}
                  </Text>
                  <Text variant="bodyMedium" style={styles.warningText}>
                    tu cuenta pasará al plan Gratis, con anuncios y menos funciones.
                  </Text>
                </>
              ) : (
                <Text variant="bodyMedium" style={styles.warningText}>
                  Tu suscripción venció. Tu cuenta pasará al plan Gratis, con
                  anuncios y menos funciones.
                </Text>
              )}
            </View>

            <Text variant="bodySmall" style={styles.note}>
              No perderás ningún dato y puedes seguir usando la app.
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={dismissMorosoWarning}
                style={styles.buttonSecondary}
                textColor="#6b7280"
              >
                Continuar
              </Button>

              <Button
                mode="contained"
                onPress={() => {
                  dismissMorosoWarning();
                  navigation.navigate("Mas", {
                    screen: "GestionarCuenta",
                    initial: false,
                  });
                }}
                style={styles.buttonPrimary}
                buttonColor="#f59e0b"
              >
                Renovar
              </Button>
            </View>
            </Surface>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 400,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontWeight: "bold",
    color: "#d97706",
    marginBottom: 4,
    textAlign: "center",
  },
  empresaName: {
    color: "#1f2937",
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  warningBox: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  warningText: {
    color: "#92400e",
    textAlign: "center",
    lineHeight: 22,
  },
  daysCount: {
    color: "#d97706",
    fontWeight: "bold",
    marginVertical: 8,
  },
  note: {
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  buttonSecondary: {
    flex: 1,
    borderRadius: 8,
    borderColor: "#d1d5db",
  },
  buttonPrimary: {
    flex: 1,
    borderRadius: 8,
  },
});
