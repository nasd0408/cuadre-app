import React, { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Portal,
  Modal,
  Text,
  Button,
  IconButton,
  useTheme,
  Surface,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { analytics } from "../analytics";

interface Slide {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: "view-dashboard-outline",
    title: "Bienvenido a Cuadre",
    body: "Tu agenda, servicios, clientes y cobros viven ahora en un solo lugar.",
  },
  {
    icon: "gesture-tap-button",
    title: "Tres acciones, cero vueltas",
    body: "Desde Inicio puedes cobrar un servicio, dejarlo pendiente o reservar una cita futura.",
  },
  {
    icon: "chart-box-outline",
    title: "Tu día, bajo control",
    body: "Cuadre actualiza ingresos, pendientes y actividad mientras trabajas. El checklist te ayudará con la configuración inicial.",
  },
];

interface WelcomeTourProps {
  visible: boolean;
  onFinish: () => void;
}

export default function WelcomeTour({ visible, onFinish }: WelcomeTourProps) {
  const theme = useTheme() as any;
  const { width } = useWindowDimensions();
  const styles = makeStyles(theme, width);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const finish = (skipped: boolean) => {
    analytics.track("welcome_tour_finished", { skipped, slide: index });
    setIndex(0);
    onFinish();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable
        onDismiss={() => finish(true)}
        contentContainerStyle={styles.container}
      >
        <View style={styles.topRow}>
          <Text variant="labelSmall" style={styles.stepLabel}>
            GUÍA RÁPIDA · {index + 1} DE {SLIDES.length}
          </Text>
          <IconButton
            icon="close"
            size={20}
            accessibilityLabel="Cerrar guía"
            onPress={() => finish(true)}
          />
        </View>

        <Surface elevation={0} style={styles.iconWrap}>
          <MaterialCommunityIcons name={slide.icon} size={32} color={theme.colors.primary} />
        </Surface>

        <Text variant="headlineSmall" style={styles.title}>{slide.title}</Text>
        <Text variant="bodyMedium" style={styles.body}>{slide.body}</Text>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            icon="chevron-left"
            disabled={index === 0}
            onPress={() => setIndex((i) => i - 1)}
          >
            Atrás
          </Button>
          <Button
            mode="contained"
            icon={isLast ? "check" : "chevron-right"}
            contentStyle={isLast ? undefined : styles.nextButtonContent}
            onPress={() =>
              isLast ? finish(false) : setIndex((i) => i + 1)
            }
          >
            {isLast ? "Ir a mi negocio" : "Siguiente"}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const makeStyles = (theme: any, width: number) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 20,
      borderRadius: 8,
      padding: 24,
      maxWidth: 480,
      alignSelf: "center",
      width: Math.min(width - 40, 480),
    },
    topRow: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: -12,
      marginRight: -12,
    },
    stepLabel: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 8,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 12,
      marginBottom: 20,
    },
    title: {
      fontWeight: "bold",
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    body: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 21,
      marginBottom: 24,
    },
    dots: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceVariant,
    },
    dotActive: {
      backgroundColor: theme.colors.primary,
      width: 20,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    },
    nextButtonContent: {
      flexDirection: "row-reverse",
    },
  });
