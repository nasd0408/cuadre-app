// Selector de contactos propio, en vez del selector del sistema.
//
// El de Android abría la GALERÍA en algunos teléfonos (intent ambiguo, ver
// src/contactos/index.ts). Este además busca y marca quién ya es cliente, cosa
// que el del sistema no puede hacer.
//
// Concentra aquí las cuatro etapas —divulgación, permiso, carga y lista— para
// que cada pantalla que lo use solo tenga que abrirlo y recibir el contacto.
import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, Modal, Pressable } from "react-native";
import {
  Text,
  Button,
  Searchbar,
  List,
  Divider,
  ActivityIndicator,
  Surface,
  useTheme,
} from "react-native-paper";
import {
  listarContactos,
  pedirPermiso,
  ContactoDelTelefono,
} from "../contactos";
import { useOfflineCacheStore } from "../stores/offlineCacheStore";

type Etapa = "aviso" | "cargando" | "lista" | "sin_permiso" | "vacio";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSeleccionar: (contacto: ContactoDelTelefono, yaEsCliente: boolean) => void;
}

/** Solo dígitos, para comparar teléfonos escritos de formas distintas. */
const soloDigitos = (t?: string) => (t || "").replace(/\D/g, "");

export default function ContactoPickerModal({
  visible,
  onDismiss,
  onSeleccionar,
}: Props) {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [etapa, setEtapa] = useState<Etapa>("aviso");
  const [contactos, setContactos] = useState<ContactoDelTelefono[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const clientesCache = useOfflineCacheStore((s) => s.clientes);

  /**
   * Los últimos 7 dígitos: evita que "0412-1234567", "4121234567" y
   * "+584121234567" se vean como tres personas distintas.
   */
  const telefonosRegistrados = useMemo(() => {
    const set = new Set<string>();
    for (const c of clientesCache) {
      const d = soloDigitos(c.telefono);
      if (d.length >= 7) set.add(d.slice(-7));
    }
    return set;
  }, [clientesCache]);

  const yaEsCliente = useCallback(
    (telefono: string) => {
      const d = soloDigitos(telefono);
      return d.length >= 7 && telefonosRegistrados.has(d.slice(-7));
    },
    [telefonosRegistrados],
  );

  const cargar = useCallback(async () => {
    setEtapa("cargando");

    const concedido = await pedirPermiso();
    if (!concedido) {
      setEtapa("sin_permiso");
      return;
    }

    const lista = await listarContactos();
    setContactos(lista);
    setEtapa(lista.length === 0 ? "vacio" : "lista");
  }, []);

  const cerrar = useCallback(() => {
    onDismiss();
    // Se reinicia después de cerrar para que la próxima apertura vuelva a
    // mostrar la divulgación y no se vea el estado anterior por un instante.
    setEtapa("aviso");
    setBusqueda("");
  }, [onDismiss]);

  const elegir = useCallback(
    (contacto: ContactoDelTelefono) => {
      onSeleccionar(contacto, yaEsCliente(contacto.telefono));
      cerrar();
    },
    [onSeleccionar, yaEsCliente, cerrar],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return contactos;

    const digitos = soloDigitos(q);
    return contactos.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (digitos.length > 0 && soloDigitos(c.telefono).includes(digitos)),
    );
  }, [contactos, busqueda]);
  /**
   * Estable entre renders a proposito: en linea es un TIPO de componente nuevo
   * cada vez, y React desmonta y remonta todos los separadores visibles.
   */

  const Separador = useCallback(() => <Divider />, [styles]);


  return (
    // Modal de React Native, no Portal de Paper: este selector también se abre
    // desde las acciones rápidas, que ya son un Modal nativo. Un Portal se
    // monta en la raíz de la app y quedaría DETRÁS de ese modal, invisible.
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cerrar}
      statusBarTranslucent
    >
      <Pressable style={styles.fondo} onPress={cerrar}>
        {/* Detiene la propagación: tocar dentro de la tarjeta no debe cerrarla. */}
        <Pressable style={styles.modal} onPress={() => {}}>
          {/* Play exige explicar POR QUÉ se necesita el permiso ANTES de que
            aparezca el diálogo del sistema. Mostrarlo después es rechazo. */}
          {etapa === "aviso" && (
            <View style={styles.centro}>
              <Text variant="titleMedium" style={styles.titulo}>
                Usar tus contactos
              </Text>
              <Text variant="bodyMedium" style={styles.parrafo}>
                Vamos a leer tu agenda solo para mostrarte la lista aquí dentro
                y que elijas a quién agregar, sin escribir su nombre y teléfono
                a mano.
              </Text>
              <Text variant="bodyMedium" style={styles.parrafo}>
                Tus contactos no salen del teléfono: solo se guarda el que
                elijas, y únicamente cuando confirmes.
              </Text>
              <View style={styles.botonera}>
                <Button mode="outlined" onPress={cerrar} style={styles.boton}>
                  Cancelar
                </Button>
                <Button mode="contained" onPress={cargar} style={styles.boton}>
                  Continuar
                </Button>
              </View>
            </View>
          )}

          {etapa === "cargando" && (
            <View style={styles.centro}>
              <ActivityIndicator size="large" />
              <Text variant="bodyMedium" style={styles.cargandoTexto}>
                Leyendo tus contactos...
              </Text>
            </View>
          )}

          {etapa === "sin_permiso" && (
            <View style={styles.centro}>
              <Text variant="titleMedium" style={styles.titulo}>
                Sin acceso a contactos
              </Text>
              <Text variant="bodyMedium" style={styles.parrafo}>
                No pasa nada: puedes escribir el nombre y el teléfono a mano. Si
                cambias de idea, actívalo en los ajustes del teléfono, en
                permisos de Cuadre APP.
              </Text>
              <Button
                mode="contained"
                onPress={cerrar}
                style={styles.botonSolo}
              >
                Entendido
              </Button>
            </View>
          )}

          {etapa === "vacio" && (
            <View style={styles.centro}>
              <Text variant="titleMedium" style={styles.titulo}>
                No encontramos contactos
              </Text>
              <Text variant="bodyMedium" style={styles.parrafo}>
                Tu agenda está vacía o ninguno de tus contactos tiene número de
                teléfono guardado.
              </Text>
              <Button
                mode="contained"
                onPress={cerrar}
                style={styles.botonSolo}
              >
                Entendido
              </Button>
            </View>
          )}

          {etapa === "lista" && (
            <View style={styles.listaContenedor}>
              <Text variant="titleMedium" style={styles.tituloLista}>
                Elige un contacto
              </Text>

              <Searchbar
                placeholder="Buscar por nombre o teléfono"
                value={busqueda}
                onChangeText={setBusqueda}
                style={styles.buscador}
              />

              <FlatList
                data={filtrados}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={Separador}
                ListEmptyComponent={
                  <Text style={styles.sinResultados}>
                    Ningún contacto coincide con "{busqueda}".
                  </Text>
                }
                renderItem={({ item }) => {
                  const registrado = yaEsCliente(item.telefono);
                  return (
                    <List.Item
                      title={item.nombre}
                      // Se avisa pero NO se bloquea: puede ser un homónimo o un
                      // número reutilizado, y el dueño sabe mejor que nosotros.
                      description={
                        registrado
                          ? `${item.telefono} · Ya está en tu lista`
                          : item.telefono
                      }
                      descriptionStyle={
                        registrado ? styles.descripcionAviso : undefined
                      }
                      left={(props) => (
                        <List.Icon
                          {...props}
                          icon={registrado ? "account-check" : "account"}
                        />
                      )}
                      onPress={() => elegir(item)}
                    />
                  );
                }}
              />

              <Surface elevation={0} style={styles.pie}>
                <Button mode="outlined" onPress={cerrar}>
                  Cancelar
                </Button>
              </Surface>
            </View>
          )}
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
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      maxHeight: "85%",
      overflow: "hidden",
    },
    centro: {
      padding: 24,
    },
    titulo: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
      marginBottom: 12,
    },
    parrafo: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
      lineHeight: 20,
    },
    botonera: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 12,
    },
    boton: {
      minWidth: 110,
    },
    botonSolo: {
      marginTop: 12,
      alignSelf: "flex-end",
      minWidth: 130,
    },
    cargandoTexto: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      marginTop: 16,
    },
    listaContenedor: {
      paddingTop: 20,
      // Sin flex:1 la FlatList colapsa dentro de un Modal con maxHeight.
      flexShrink: 1,
    },
    tituloLista: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    buscador: {
      marginHorizontal: 16,
      marginBottom: 8,
    },
    sinResultados: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      padding: 24,
    },
    descripcionAviso: {
      color: theme.colors.primary,
    },
    pie: {
      padding: 12,
      alignItems: "flex-end",
      backgroundColor: theme.colors.surface,
    },
  });
