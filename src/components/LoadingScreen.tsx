import React, { useMemo } from "react";
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Surface, Text, useTheme } from 'react-native-paper';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Cargando...' }: LoadingScreenProps) {
    const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Surface style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.message}>{message}</Text>
    </Surface>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  message: {
    marginTop: 16,
    color: theme.colors.onBackground,
  },
});