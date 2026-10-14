import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

interface Props {
  onPress?: () => void;
}

export default function SubscriptionBanner({ onPress }: Props) {
  const { status } = useSubscriptionStore();
  // SubscriptionBanner.tsx
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Only show for Moroso status
  if (!status || status.estado !== "Moroso") {
    return null;
  }

  const diasRestantes = status.diasHastaBloqueo ?? 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Surface elevation={0} style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Surface elevation={0} style={styles.textContainer}>
          {/* Vencer ya no bloquea la cuenta: la baja a plan Gratis. El aviso debe
              decir lo que realmente va a pasar, no amenazar con un corte de acceso. */}
          <Text style={styles.text}>
            Suscripción vencida
            {diasRestantes > 0
              ? ` • pasa a Gratis en ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}`
              : " • tu plan pasará a Gratis"}
          </Text>
        </Surface>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Mas", {
              screen: "GestionarCuenta",
              initial: false, // esto le dice que NO resetee el stack
            })
          }
        >
          <Text style={styles.action}>Renovar</Text>
        </TouchableOpacity>
      </Surface>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    backgroundColor: theme.colors.warnContainer,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.warn,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: theme.colors.onWarnContainer,
    fontSize: 13,
    fontWeight: "500",
  },
  action: {
    color: theme.colors.warn,
    fontSize: 13,
    fontWeight: "bold",
  },
});
