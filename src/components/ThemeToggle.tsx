import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Card, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeStore, ThemeMode } from "../stores/themeStore";

const OPTIONS: { value: ThemeMode; icon: any; label: string }[] = [
  { value: "light", icon: "weather-sunny", label: "Claro" },
  { value: "system", icon: "theme-light-dark", label: "Sistema" },
  { value: "dark", icon: "weather-night", label: "Oscuro" },
];

export default function ThemeToggle() {
  const { mode, setMode } = useThemeStore();
  const theme = useTheme() as any;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="bodySmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          Apariencia
        </Text>
        <View style={[styles.selector, { backgroundColor: theme.colors.surfaceVariant }]}>
          {OPTIONS.map((option) => {
            const isActive = mode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setMode(option.value)}
                style={[
                  styles.option,
                  isActive && { backgroundColor: theme.colors.surface },
                  isActive && styles.optionActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={18}
                  color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="labelSmall"
                  style={{ color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant, marginTop: 2 }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  label: {
    marginBottom: 10,
  },
  selector: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 2,
  },
  optionActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});