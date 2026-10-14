import React, { useMemo } from "react";
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  icon,
  color = '#1a1a2e',
  subtitle,
}: MetricCardProps) {
    const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Card elevation={0} style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={[styles.iconChip, { backgroundColor: `${color}18` }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <Text variant="headlineSmall" style={[styles.value, { color }]}>
          {value}
        </Text>
        <Text variant="bodySmall" style={styles.title}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="labelSmall" style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    minWidth: '45%',
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 0,
  },
  content: {
    alignItems: 'flex-start',
    paddingVertical: 15,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    marginBottom: 12,
  },
  value: {
    fontWeight: '800',
    fontSize: 24,
    letterSpacing: -0.3,
  },
  title: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'left',
    marginTop: 2,
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
    fontSize: 10,
    opacity: 0.85,
  },
});
