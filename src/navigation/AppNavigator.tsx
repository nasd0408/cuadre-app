import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { IconButton, useTheme } from "react-native-paper";
import { StyleSheet } from "react-native";

// Screens
import DashboardScreen from "../screens/admin/DashboardScreen";
import CitasScreen from "../screens/shared/CitasScreen";
import CitaDetalleScreen from "../screens/shared/CitaDetalleScreen";
import ClientesScreen from "../screens/shared/ClientesScreen";
import ClienteFormScreen from "../screens/shared/ClienteFormScreen";
import ClienteDetalleScreen from "../screens/shared/ClienteDetalleScreen";
import MasScreen from "../screens/shared/MasScreen";
import ServiciosScreen from "../screens/admin/ServiciosScreen";
import ServicioFormScreen from "../screens/admin/ServicioFormScreen";
import EmpleadosScreen from "../screens/admin/EmpleadosScreen";
import EmpleadoFormScreen from "../screens/admin/EmpleadoFormScreen";
import EmpleadoDetalleScreen from "../screens/admin/EmpleadoDetalleScreen";
import NominasScreen from "../screens/admin/NominaScreen";
import { useAuthStore } from "../stores/authStore";
import DeudoresScreen from "../screens/admin/DeudoresScreen";
import HistorialIngresosScreen from "../screens/admin/HistorialIngresosScreen";
import AjustesScreen from "../screens/shared/AjustesScreen";
import PerfilPublicoScreen from "../screens/admin/PerfilPublicoScreen";
import HorarioEmpleadoScreen from "../screens/admin/HorarioEmpleadoScreen";
import GestionarCuentaScreen from "../screens/restriction/GestionarCuentaScreen";
import ClientesHubScreen from "../screens/shared/ClienteHubScreen";
import RecordatoriosScreen from "../screens/admin/RecordatoriosScreen";
import EmpleadoHistorialScreen from "../screens/admin/EmpleadoHistorialScreen";
import MensajeriaConfigScreen from "../screens/admin/MensajeriaConfigScreen";
import NotificacionesScreen from "../screens/shared/NotificacionesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Estilo de header consistente: superficie limpia, título en negrita, sin sombra dura.
const navScreenOptions = (theme: any) => ({
  headerStyle: { backgroundColor: theme.colors.surface },
  headerTintColor: theme.colors.onSurface,
  headerTitleStyle: { fontWeight: "700" as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.colors.background },
});

function CitasStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={navScreenOptions(theme)}>
      <Stack.Screen
        name="CitasList"
        component={CitasScreen}
        options={{ title: "Citas" }}
      />
      <Stack.Screen
        name="CitaDetalle"
        component={CitaDetalleScreen}
        options={{ title: "Detalle de Cita" }}
      />
    </Stack.Navigator>
  );
}

function ClientesStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={navScreenOptions(theme)}>
      {/* Hub como pantalla principal */}
      <Stack.Screen
        name="ClientesHub"
        component={ClientesHubScreen}
        options={{ title: "Clientes" }}
      />
      <Stack.Screen
        name="ClientesList"
        component={ClientesScreen}
        options={{ title: "Todos los clientes" }}
      />
      <Stack.Screen
        name="ClienteForm"
        component={ClienteFormScreen}
        options={{ title: "Cliente" }}
      />
      <Stack.Screen
        name="ClienteDetalle"
        component={ClienteDetalleScreen}
        options={{ title: "Detalle" }}
      />
      <Stack.Screen
        name="Deudores"
        component={DeudoresScreen}
        options={{ title: "Clientes deudores" }}
      />
      <Stack.Screen
        name="Recordatorios"
        component={RecordatoriosScreen}
        options={{ title: "Recordatorios" }}
      />
    </Stack.Navigator>
  );
}

function MasStack() {
  const theme = useTheme();
  const isAdmin = useAuthStore(state => state.isAdmin);
  return (
    <Stack.Navigator
      initialRouteName="MasMenu"
      screenOptions={navScreenOptions(theme)}
    >
      <Stack.Screen
        name="MasMenu"
        component={MasScreen}
        options={{ title: "Más" }}
      />
      <Stack.Screen
        name="Servicios"
        component={ServiciosScreen}
        options={{ title: "Servicios" }}
      />
      <Stack.Screen
        name="MensajeriaConfig"
        component={MensajeriaConfigScreen}
        options={{ title: "Mensajería WhatsApp" }}
      />
      <Stack.Screen
        name="ServicioForm"
        component={ServicioFormScreen}
        options={{ title: "Servicio" }}
      />
      <Stack.Screen
        name="Empleados"
        component={EmpleadosScreen}
        options={{ title: "Empleados" }}
      />
      <Stack.Screen
        name="EmpleadoForm"
        component={EmpleadoFormScreen}
        options={{ title: "Empleado" }}
      />
      <Stack.Screen
        name="EmpleadoDetalle"
        component={EmpleadoDetalleScreen}
        options={{ title: "Detalle Empleado" }}
      />
      <Stack.Screen
        name="EmpleadoHistorial"
        component={EmpleadoHistorialScreen}
        options={({ route }: any) => ({
          title: `Historial · ${route.params.nombre}`,
        })}
      />
      <Stack.Screen
        name="Nominas"
        component={NominasScreen}
        options={{ title: "Nóminas y Pagos" }}
      />
      <Stack.Screen
        name="HistorialIngresos"
        component={HistorialIngresosScreen}
        options={{ title: "Historial de Ingresos" }}
      />

      <Stack.Screen
        name="Ajustes"
        component={AjustesScreen}
        options={{ title: "Configuración" }}
      />
      {isAdmin && <Stack.Screen name="PerfilPublico" component={PerfilPublicoScreen} options={{ title: "Perfil público y locales" }} />}
      {isAdmin && <Stack.Screen name="HorarioEmpleado" component={HorarioEmpleadoScreen} options={{ title: "Horario y disponibilidad" }} />}
      <Stack.Screen
        name="GestionarCuenta"
        component={GestionarCuentaScreen}
        options={{ title: "Gestionar Cuenta" }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const theme = useTheme();
  const { user } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={{
        ...navScreenOptions(theme),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          paddingBottom: 10,
          paddingTop: 8,
          height: 64,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-dashboard"
              size={size}
              color={color}
            />
          ),
          headerTitle: user?.empresa || "Dashboard",
          headerRight: () => (
            <IconButton
              icon="bell-outline"
              iconColor={theme.colors.primary}
              accessibilityLabel="Abrir notificaciones"
              onPress={() =>
                navigation.getParent()?.navigate("Notificaciones")
              }
            />
          ),
        })}
      />
      <Tab.Screen
        name="Citas"
        component={CitasStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="calendar-clock"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientesStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-multiple"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Mas"
        component={MasStack}
        options={{
          headerShown: false,
          title: "Más",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={navScreenOptions(theme)}>
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notificaciones"
        component={NotificacionesScreen}
        options={{ title: "Notificaciones" }}
      />

      {/* Flujos de creación lanzados desde CTAs/onboarding: se presentan como
          modales a nivel raíz para NO ensuciar el stack de ningún tab.
          Al cerrarlos (goBack) se vuelve a donde se estaba (ej. Dashboard). */}
      <Stack.Group
        screenOptions={{
          ...navScreenOptions(theme),
          presentation: "modal",
        }}
      >
        <Stack.Screen
          name="ServicioFormModal"
          component={ServicioFormScreen}
          options={{ title: "Nuevo Servicio" }}
        />
        <Stack.Screen
          name="EmpleadoFormModal"
          component={EmpleadoFormScreen}
          options={{ title: "Nuevo Empleado" }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
