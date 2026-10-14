// components/Screen.tsx
import React, { ReactNode } from 'react';
import { SafeAreaView, Edges } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AdBanner } from '../ads';

interface ScreenProps {
  children: ReactNode;
  edges?: Edges;
  /** Oculta el banner del plan Gratis (pantallas a pantalla completa, formularios largos). */
  sinAnuncios?: boolean;
}

export default function Screen({
  children,
  edges = ['top', 'bottom'] as const,
  sinAnuncios = false,
}: ScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={edges}
    >
      {children}
      {/* Un único punto de montaje para el banner: se renderiza solo si el plan
          lo pide (AdBanner decide), y queda siempre bajo el contenido. */}
      {!sinAnuncios && <AdBanner />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
