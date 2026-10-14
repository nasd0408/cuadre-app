// Ultima red antes de la pantalla en blanco.
//
// initErrorTracking() captura los errores del hilo JS, pero NO los que ocurren
// durante el render de React: esos desmontan el arbol entero y dejan la app en
// blanco, sin mensaje y sin salida. Para el dueno de una barberia eso no es un
// error, es una app rota, y no vuelve a abrirla.
//
// Un limite de error convierte ese fallo total en una pantalla con contexto y
// un boton de reintentar, y ademas lo manda a Crashlytics: hoy esos fallos no
// se registran en ninguna parte.
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Button } from "react-native-paper";
import { analytics } from "../analytics";

interface Props {
  children: React.ReactNode;
  /** Nombre del trozo de arbol que protege, para distinguirlo en Crashlytics. */
  ambito?: string;
  /** Permite a la pantalla envolvente ofrecer su propia salida. */
  onReintentar?: () => void;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // El stack de componentes dice QUE pantalla reventó; el stack de JS solo
    // dice en que funcion, que despues de R8 puede no significar gran cosa.
    analytics.captureError(error, {
      source: "render",
      ambito: this.props.ambito ?? "app",
      componentStack: (info?.componentStack ?? "").slice(0, 500),
    });
  }

  private reintentar = () => {
    this.setState({ error: null });
    this.props.onReintentar?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={estilos.contenedor}>
        <Text variant="headlineSmall" style={estilos.titulo}>
          Algo se rompió
        </Text>

        <Text variant="bodyMedium" style={estilos.texto}>
          No es culpa tuya y tus datos están a salvo. Ya nos llegó el aviso para
          poder arreglarlo.
        </Text>

        {/* En desarrollo se enseña el error; en produccion seria ruido que el
            usuario no puede accionar. */}
        {__DEV__ && (
          <ScrollView style={estilos.detalle}>
            <Text style={estilos.detalleTexto}>
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </Text>
          </ScrollView>
        )}

        <Button
          mode="contained"
          onPress={this.reintentar}
          style={estilos.boton}
          icon="refresh"
        >
          Reintentar
        </Button>
      </View>
    );
  }
}

const estilos = StyleSheet.create({
  // Sin useTheme a proposito: si lo que reventó fue el proveedor de tema, un
  // hook de tema aqui volveria a reventar y no se veria nada.
  contenedor: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f7f7ef",
  },
  titulo: {
    color: "#171b16",
    fontWeight: "bold",
    marginBottom: 12,
  },
  texto: {
    color: "#4a4a44",
    lineHeight: 20,
    marginBottom: 24,
  },
  detalle: {
    maxHeight: 220,
    backgroundColor: "#fffef8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  detalleTexto: {
    color: "#a93563",
    fontSize: 11,
    fontFamily: "monospace",
  },
  boton: {
    alignSelf: "flex-start",
  },
});
