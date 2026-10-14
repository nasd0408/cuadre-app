import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PercentageChangeProps {
  value: number;
  label?: string;
}

export default function PercentageChange({ value, label }: PercentageChangeProps) {
  const isPositive = value >= 0;
  const color = isPositive ? '#27ae60' : '#e74c3c';
  const icon = isPositive ? 'trending-up' : 'trending-down';

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[styles.value, { color }]}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </Text>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    color: '#999',
  },
});