import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  /** CTA opcional; si se pasa onAction, se muestra el botón. */
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}

/** Estado vacío consistente con ícono, texto y una acción directa opcional. */
export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  disabled,
}: EmptyStateProps) {
  const theme = useTheme() as any;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name={icon} size={36} color={theme.colors.primary} />
      </View>
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          mode="contained"
          icon="plus"
          onPress={onAction}
          disabled={disabled}
          style={styles.button}
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
});
