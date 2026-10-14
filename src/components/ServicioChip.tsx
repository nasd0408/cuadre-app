import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, useTheme } from "react-native-paper";
import { Servicio } from "../types";

interface ServicioChipProps {
  servicio: Servicio;
  selected: boolean;
  onPress: () => void;
}

/** Mantiene visible la identidad cromática elegida para cada servicio. */
export default function ServicioChip({ servicio, selected, onPress }: ServicioChipProps) {
  const theme = useTheme() as any;
  const color = servicio.colorHex || theme.colors.primary;

  return (
    <Chip
      selected={selected}
      onPress={onPress}
      icon={() => <View style={[styles.dot, { backgroundColor: color }]} />}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? `${color}26` : theme.colors.surface,
          borderColor: selected ? color : theme.colors.outlineVariant,
        },
      ]}
      textStyle={styles.text}
      showSelectedOverlay={false}
    >
      {servicio.nombre} · ${servicio.precio}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { fontWeight: "600" },
});
