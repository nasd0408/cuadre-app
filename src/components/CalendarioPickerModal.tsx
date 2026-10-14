// Elección del calendario donde se guardan las citas.
//
// Con varias cuentas de Google en el teléfono, la heurística automática siempre
// acierta a medias: sabe elegir "un" calendario de Google, no sabe cuál de tus
// cuentas es la del trabajo. Y hay quien prefiere a propósito un calendario
// local que no suba a ninguna nube.
//
// Se agrupa por cuenta porque es como el usuario piensa en esto: primero "¿en
// qué cuenta?", después "¿en cuál de sus calendarios?".
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Modal, Pressable } from "react-native";
import {
  Text,
  Button,
  List,
  Divider,
  ActivityIndicator,
  useTheme,
} from "react-native-paper";
import {
  listarCalendarios,
  destinoElegido,
  fijarDestino,
  CalendarioDestino,
} from "../calendario";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** Se llama tras guardar, para que Ajustes refresque lo que muestra. */
  onGuardado: () => void;
}

export default function CalendarioPickerModal({
  visible,
  onDismiss,
  onGuardado,
}: Props) {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [cargando, setCargando] = useState(true);
  const [calendarios, setCalendarios] = useState<CalendarioDestino[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    let vigente = true;
    setCargando(true);

    Promise.all([listarCalendarios(), destinoElegido()]).then(
      ([lista, elegido]) => {
        // El modal pudo cerrarse mientras se leía el calendario.
        if (!vigente) return;
        setCalendarios(lista);
        setSeleccion(elegido);
        setCargando(false);
      },
    );

    return () => {
      vigente = false;
    };
  }, [visible]);

  /** Agrupa por cuenta conservando el orden en que llegan del sistema. */
  const porCuenta = useMemo(() => {
    const grupos = new Map<string, CalendarioDestino[]>();
    for (const c of calendarios) {
      const actual = grupos.get(c.cuenta);
      if (actual) actual.push(c);
      else grupos.set(c.cuenta, [c]);
    }
    return Array.from(grupos.entries());
  }, [calendarios]);

  const guardar = useCallback(async () => {
    await fijarDestino(seleccion);
    onGuardado();
    onDismiss();
  }, [seleccion, onGuardado, onDismiss]);

  return (
    // Modal de React Native por coherencia con el resto de la app y para que
    // funcione igual si algún día se abre desde dentro de otro modal.
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.fondo} onPress={onDismiss}>
        <Pressable style={styles.tarjeta} onPress={() => {}}>
          <Text variant="titleMedium" style={styles.titulo}>
            ¿Dónde guardamos tus citas?
          </Text>

          {cargando ? (
            <View style={styles.centro}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <ScrollView style={styles.lista}>
              <List.Item
                title="Automático"
                description="Usamos el calendario principal disponible, priorizando Google"
                left={(props) => <List.Icon {...props} icon="auto-fix" />}
                right={(props) =>
                  seleccion === null ? (
                    <List.Icon {...props} icon="check" color={theme.colors.primary} />
                  ) : null
                }
                onPress={() => setSeleccion(null)}
              />

              {porCuenta.map(([cuenta, items]) => (
                <View key={cuenta}>
                  <Divider />
                  <List.Subheader style={styles.cuenta}>{cuenta}</List.Subheader>
                  {items.map((c) => (
                    <List.Item
                      key={c.id}
                      title={c.titulo}
                      description={
                        c.sincronizaConLaNube
                          ? "Se sincroniza con tu cuenta"
                          : "Solo en este teléfono"
                      }
                      left={(props) => (
                        <List.Icon
                          {...props}
                          icon={
                            c.sincronizaConLaNube
                              ? "cloud-check-outline"
                              : "cellphone"
                          }
                        />
                      )}
                      right={(props) =>
                        seleccion === c.id ? (
                          <List.Icon
                            {...props}
                            icon="check"
                            color={theme.colors.primary}
                          />
                        ) : null
                      }
                      onPress={() => setSeleccion(c.id)}
                    />
                  ))}
                </View>
              ))}

              {calendarios.length === 0 && (
                <Text style={styles.vacio}>
                  No encontramos ningún calendario donde podamos escribir. Si
                  agregas una cuenta de Google al teléfono, aparecerá aquí.
                </Text>
              )}
            </ScrollView>
          )}

          <View style={styles.botonera}>
            <Button mode="outlined" onPress={onDismiss} style={styles.boton}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={guardar}
              disabled={cargando}
              style={styles.boton}
            >
              Guardar
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fondo: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 20,
    },
    tarjeta: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      maxHeight: "85%",
      overflow: "hidden",
      paddingTop: 20,
    },
    titulo: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    centro: {
      padding: 40,
    },
    // Sin flexShrink la lista desborda la tarjeta en vez de hacer scroll.
    lista: {
      flexShrink: 1,
    },
    cuenta: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    vacio: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      padding: 24,
    },
    botonera: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      padding: 16,
    },
    boton: {
      minWidth: 110,
    },
  });
