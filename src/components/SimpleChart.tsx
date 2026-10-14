import React, { useMemo } from "react";
import { View, StyleSheet } from 'react-native';
import { Text, useTheme,Surface } from 'react-native-paper';

interface SimpleChartProps {
  data: { etiqueta: string; valor: number }[];
  color?: string;
  height?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

export default function SimpleChart({
  data,
  color = '#27ae60',
  height = 120,
  showValues = true,
  formatValue = (v) => v.toString(),
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map((d) => d.valor), 1);
    const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Surface  elevation={0} style={styles.container}>
      <Surface elevation={0} style={[styles.chartArea, { height }]}>
        {data.map((item, index) => {
          const barHeight = (item.valor / maxValue) * 100;
          return (
            <Surface elevation={0} key={index} style={styles.barContainer}>
              {showValues && item.valor > 0 && (
                <Text style={styles.barValue}>{formatValue(item.valor)}</Text>
              )}
              <Surface elevation={0} style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(barHeight, 3)}%`,
                      backgroundColor: item.valor > 0 ? color : theme.colors.tertiary,
                    },
                  ]}
                />
              </Surface>
              <Text style={styles.barLabel}>{item.etiqueta}</Text>
            </Surface>
          );
        })}
      </Surface>
    </Surface>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    width: '100%',
    backgroundColor: theme.colors.surface,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 9,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  barWrapper: {
    width: '70%',
    height: '70%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 3,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.onSurface,
    marginTop: 6,
  },
});