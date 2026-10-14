// screens/citas/CitasScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Platform,
  UIManager,
  LayoutAnimation,
} from "react-native";
import {
  Text,
  ActivityIndicator,
  Button,
  Surface,
  useTheme,
  Portal,
  Dialog,
  RadioButton,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import EmptyState from "../../components/EmptyState";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { citasApi } from "../../api/citas";
import { CitaResponse, CitasPagedResponse, EstadoCita } from "../../types";
import { LoadingScreen, ErrorMessage } from "../../components";
import { usePlanStore } from "../../stores/planStore";
import { useUpgradePrompt } from "../../hooks/useUpgradePrompt";
import CalendarView from "./CalendarView";

import { analytics } from '../../analytics';
import { useCargaCancelable } from '../../hooks/useCargaCancelable';
import { mensajeDeError } from '../../utils/alert';
import { useAgendaRealtime } from '../../hooks/useAgendaRealtime';
import { filtrosRangoCitas } from '../../utils/agenda';
import { localDateString } from '../../utils/datetime';
// En la arquitectura antigua Android necesita habilitar LayoutAnimation a mano.
// En Bridgeless/New Architecture la llamada solo produce un warning: React
// Native ya la implementa como no-op porque Fabric gestiona las animaciones.
if (
  Platform.OS === "android" &&
  (global as any).RN$Bridgeless !== true &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ScreenMode = "list" | "calendar";
type DatePreset = "todo" | "hoy" | "ayer" | "semana" | "mes" | "custom";

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CitasScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { tieneModulo } = usePlanStore();
  const isFocused = useIsFocused();
  const { pedirUpgrade } = useUpgradePrompt();
  const modCalendario = tieneModulo("calendario");

  const [data, setData] = useState<CitasPagedResponse | null>(null);
  const [calendarCitas, setCalendarCitas] = useState<CitaResponse[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Estado filter
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");
  const [estadoDialogVisible, setEstadoDialogVisible] = useState(false);
  const [filtroTemp, setFiltroTemp] = useState<string>("todas");

  // Screen mode
  const [screenMode, setScreenMode] = useState<ScreenMode>(
    modCalendario ? "calendar" : "list"
  );

  // Date preset filter
  const [datePreset, setDatePreset] = useState<DatePreset>("mes");
  const [customDialogVisible, setCustomDialogVisible] = useState(false);
  const todayNow = new Date();
  const [customDesde, setCustomDesde] = useState({
    year: todayNow.getFullYear(),
    month: todayNow.getMonth(),
  });
  const [customHasta, setCustomHasta] = useState({
    year: todayNow.getFullYear(),
    month: todayNow.getMonth(),
  });

  // Expandable sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

  const theme = useTheme() as any;
  const s = useMemo(() => makeStyles(theme), [theme]);

  /**
   * Estable entre renders a proposito: en linea es un TIPO de componente nuevo
   * cada vez, y React desmonta y remonta todos los separadores visibles.
   */
  const Separador = useCallback(() => <View style={s.separator} />, [s]);
  // ─── Estado config ─────────────────────────────────────────────────────────
  const ESTADO_CONFIG: Record<
    number,
    { label: string; color: string; colorContainer: string; icon: string }
  > = {
    [EstadoCita.Pendiente]: {
      label: "Pendiente",
      color: theme.colors.schedule,
      colorContainer: theme.colors.scheduleContainer,
      icon: "clock-outline",
    },
    [EstadoCita.PagoPendiente]: {
      label: "Por Cobrar",
      color: theme.colors.warn,
      colorContainer: theme.colors.warnContainer,
      icon: "cash-clock",
    },
    [EstadoCita.Pagada]: {
      label: "Pagada",
      color: theme.colors.primary,
      colorContainer: theme.colors.primaryContainer,
      icon: "cash-check",
    },
    [EstadoCita.Cerrada]: {
      label: "Cerrada",
      color: theme.colors.cuarto,
      colorContainer: theme.colors.cuartoContainer,
      icon: "check-circle",
    },
    [EstadoCita.Cancelada]: {
      label: "Cancelada",
      color: theme.colors.error,
      colorContainer: theme.colors.errorContainer,
      icon: "close-circle",
    },
  };

  const FILTROS_DISPONIBLES = [
    { value: "todas", label: "Todas las citas", icon: "calendar-outline" },
    { value: String(EstadoCita.PagoPendiente), label: "Por Cobrar", icon: "cash-clock" },
    { value: String(EstadoCita.Pendiente), label: "Pendientes", icon: "clock-outline" },
    { value: String(EstadoCita.Cerrada), label: "Cerradas", icon: "check-circle-outline" },
    { value: String(EstadoCita.Cancelada), label: "Canceladas", icon: "close-circle-outline" },
  ];

  const DATE_PRESETS: { value: DatePreset; label: string; icon: string }[] = [
    { value: "hoy", label: "Hoy", icon: "calendar-today" },
    { value: "ayer", label: "Ayer", icon: "calendar-arrow-left" },
    { value: "semana", label: "Semana", icon: "calendar-week" },
    { value: "mes", label: "Este mes", icon: "calendar-month" },
    { value: "todo", label: "Todo", icon: "calendar-blank-multiple" },
    { value: "custom", label: "Rango", icon: "calendar-range" },
  ];

  // ─── Calcular rango desde preset ──────────────────────────────────────────
  const getDateRange = useCallback((): { from: Date; to: Date } | null => {
    const now = new Date();
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

    switch (datePreset) {
      case "hoy":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "ayer": {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: endOfDay(y) };
      }
      case "semana": {
        const mon = new Date(now);
        mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
        const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
        return { from: startOfDay(mon), to: endOfDay(sun) };
      }
      case "mes":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        };
      case "custom":
        return {
          from: new Date(customDesde.year, customDesde.month, 1),
          to: new Date(customHasta.year, customHasta.month + 1, 0, 23, 59, 59),
        };
      case "todo":
      default:
        return null;
    }
  }, [datePreset, customDesde, customHasta]);

  const cargar = useCargaCancelable();

  // ─── Fetch lista paginada ──────────────────────────────────────────────────
  const fetchCitas = useCallback(
    async (page = 1, append = false) => {
      setError("");
      const range = getDateRange();
      const filtros: any = { page, pageSize: 20 };
      if (filtroEstado !== "todas") filtros.estado = parseInt(filtroEstado);
      if (range) {
        Object.assign(filtros, filtrosRangoCitas(range.from, range.to));
      }

      // Los chips de rango y estado disparan una petición por toque. Sin esto
      // ganaba la que llegara antes, no la última pedida: tocar "hoy" → "semana"
      // → "mes" podía dejar en pantalla los resultados de "hoy".
      await cargar(
        () => citasApi.getAll(filtros),
        (response) => {
          if (append) {
            setData((prev) =>
              prev
                ? { ...response, items: [...prev.items, ...response.items] }
                : response
            );
          } else {
            setData(response);
          }
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        },
        (err) => {
          setError(mensajeDeError(err, "No pudimos cargar las citas"));
          analytics.captureError(err, { origen: 'CitasScreen' });
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        },
      );
    },
    [filtroEstado, getDateRange, cargar]
  );

  // ─── Fetch calendario ──────────────────────────────────────────────────────
  const calendarRange = useRef<{ from: Date; to: Date } | null>(null);
  const calendarRequest = useRef<AbortController | null>(null);
  useEffect(() => () => calendarRequest.current?.abort(), []);
  const cargarCalendario = useCargaCancelable();
  const fetchCalendarCitas = useCallback(
    async (from: Date, to: Date) => {
      calendarRange.current = { from, to };
      calendarRequest.current?.abort();
      const controller = new AbortController();
      calendarRequest.current = controller;
      setCalendarLoading(true);
      setCalendarError('');
      await cargarCalendario(
        () => citasApi.getRangoCalendario(from, to, filtroEstado === 'todas' ? undefined : parseInt(filtroEstado), controller.signal),
        citas => { setCalendarCitas(citas); setCalendarLoading(false); },
        err => {
          setCalendarLoading(false);
          setCalendarError(mensajeDeError(err, 'No pudimos cargar las citas del calendario.'));
          analytics.captureError(err, { origen: 'CitasScreen', detalle: "Error cargando citas del calendario" });
        },
      );
    },
    [filtroEstado, cargarCalendario]
  );

  const refrescarCalendario = useCallback(() => {
    if (calendarRange.current) void fetchCalendarCitas(calendarRange.current.from, calendarRange.current.to);
  }, [fetchCalendarCitas]);

  useAgendaRealtime(() => {
    if (screenMode === 'list') void fetchCitas(1, false);
    else refrescarCalendario();
  }, isFocused);

  useEffect(() => {
    if (screenMode === "list") {
      setLoading(true);
      fetchCitas(1, false);
    }
  }, [screenMode, fetchCitas]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (screenMode === "list") fetchCitas(1, false);
      else refrescarCalendario();
    });
    return unsubscribe;
  }, [navigation, screenMode, fetchCitas, refrescarCalendario]);

  const onRefresh = () => { setRefreshing(true); fetchCitas(1, false); };
  const onEndReached = () => {
    if (data?.hasNextPage && !loadingMore) {
      setLoadingMore(true);
      fetchCitas(data.currentPage + 1, true);
    }
  };

  // ─── Cambio de modo ────────────────────────────────────────────────────────
  const handleModeChange = (mode: ScreenMode) => {
    if (mode === "calendar" && !modCalendario) {
      pedirUpgrade({
        tipo: "modulo",
        modulo: "calendario",
        nombre: "Vista de calendario",
      });
      return;
    }
    setScreenMode(mode);
  };

  // ─── Colapsar / expandir sección ──────────────────────────────────────────
  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── Helpers de formato ────────────────────────────────────────────────────
  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;

  const formatSectionDate = (dateKey: string) => {
    const date = new Date(dateKey + "T12:00:00");
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === now.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";
    if (date.toDateString() === tomorrow.toDateString()) return "Mañana";
    return date.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  // ─── Datos de secciones ────────────────────────────────────────────────────
  const citasSections = useMemo(() => {
    const items = data?.items || [];
    const grouped: Record<string, CitaResponse[]> = {};
    items.forEach((c) => {
      const key = localDateString(new Date(c.fecha));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a)) // más reciente primero
      .map(([dateKey, sectionItems]) => ({
        key: dateKey,
        title: formatSectionDate(dateKey),
        totalSection: sectionItems.reduce((sum, c) => sum + c.total, 0),
        count: sectionItems.length,
        // SectionList no renderiza items cuando data=[] pero sí el header
        data: collapsedSections.has(dateKey) ? [] : sectionItems,
      }));
  }, [data?.items, collapsedSections]);

  // ─── Render card ───────────────────────────────────────────────────────────
  const renderCita = ({ item }: { item: CitaResponse }) => {
    const cfg = ESTADO_CONFIG[item.estado];

    return (
      <TouchableOpacity
        style={s.timelineRow}
        onPress={() => navigation.navigate("CitaDetalle", { citaId: item.id })}
        activeOpacity={0.75}
      >
        <View style={s.timelineRail}>
          <Text style={s.timelineTime}>{formatTime(item.fecha)}</Text>
          <View style={[s.timelineDot, { backgroundColor: cfg?.color }]} />
          <View style={s.timelineLine} />
        </View>

        <View style={s.appointmentContent}>
          <View style={s.appointmentTop}>
            <View style={s.appointmentTitleBlock}>
              <Text style={s.clienteNombre} numberOfLines={1}>
                {item.clienteNombre}
              </Text>
              <Text style={s.servicioPreview} numberOfLines={1}>
                {item.servicios.map((sv) => sv.servicioNombre).join(" · ")}
              </Text>
            </View>
            <Text style={s.totalText}>{formatCurrency(item.total)}</Text>
          </View>

          <View style={s.appointmentMeta}>
            <View style={s.employeeMeta}>
              <MaterialCommunityIcons
                name="content-cut"
                size={13}
                color={theme.colors.outline}
              />
              <Text style={s.infoText} numberOfLines={1}>
                {item.empleadoNombre}
              </Text>
            </View>
            <View style={s.statusInline}>
              <View style={[s.statusMiniDot, { backgroundColor: cfg?.color }]} />
              <Text style={[s.estadoLabel, { color: cfg?.color }]}>{cfg?.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render section header ─────────────────────────────────────────────────
  const renderSectionHeader = ({
    section,
  }: {
    section: (typeof citasSections)[0];
  }) => {
    const collapsed = collapsedSections.has(section.key);
    return (
      <TouchableOpacity
        style={s.sectionHeader}
        onPress={() => toggleSection(section.key)}
        activeOpacity={0.7}
      >
        <View style={s.sectionHeaderLeft}>
          <Text style={s.sectionTitle}>{section.title}</Text>
          <View
            style={[
              s.sectionCountBadge,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <Text style={[s.sectionCountText, { color: theme.colors.secondary }]}>
              {section.count}
            </Text>
          </View>
        </View>
        <View style={s.sectionHeaderRight}>
          <Text style={[s.sectionTotal, { color: theme.colors.primary }]}>
            {formatCurrency(section.totalSection)}
          </Text>
          <MaterialCommunityIcons
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={20}
            color={theme.colors.outline}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () =>
    loadingMore ? (
      <View style={s.loadingMore}>
        <ActivityIndicator size="small" />
      </View>
    ) : null;

  // ─── Barra de chips de fecha ───────────────────────────────────────────────
  const renderDateFilterBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.dateBar}
      contentContainerStyle={s.dateBarContent}
    >
      {DATE_PRESETS.map((p) => {
        const active = datePreset === p.value;
        return (
          <TouchableOpacity
            key={p.value}
            style={[
              s.dateChip,
              active && { backgroundColor: theme.colors.secondaryContainer },
            ]}
            onPress={() => {
              if (p.value === "custom") {
                setCustomDialogVisible(true);
              } else {
                setDatePreset(p.value);
              }
            }}
          >
            <MaterialCommunityIcons
              name={p.icon as any}
              size={14}
              color={active ? theme.colors.secondary : theme.colors.outline}
            />
            <Text
              style={[
                s.dateChipText,
                active && { color: theme.colors.secondary, fontWeight: "700" },
              ]}
            >
              {p.value === "custom" && datePreset === "custom"
                ? `${MESES_CORTOS[customDesde.month]} ${customDesde.year} – ${MESES_CORTOS[customHasta.month]} ${customHasta.year}`
                : p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ─── Month picker ──────────────────────────────────────────────────────────
  const MonthPicker = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: { year: number; month: number };
    onChange: (v: { year: number; month: number }) => void;
  }) => {
    const addMonth = (delta: number) => {
      let { year, month } = value;
      month += delta;
      if (month > 11) { month = 0; year++; }
      if (month < 0) { month = 11; year--; }
      onChange({ year, month });
    };
    return (
      <View style={s.monthPickerRow}>
        <Text style={s.monthPickerLabel}>{label}</Text>
        <View style={s.monthPickerControls}>
          <TouchableOpacity onPress={() => addMonth(-1)} style={s.monthPickerBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={s.monthPickerValue}>
            {MESES_CORTOS[value.month]} {value.year}
          </Text>
          <TouchableOpacity onPress={() => addMonth(1)} style={s.monthPickerBtn}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Labels activos ────────────────────────────────────────────────────────
  const filtroEstadoLabel =
    FILTROS_DISPONIBLES.find((f) => f.value === filtroEstado)?.label || "Todas";
  const filtroEstadoIcon =
    FILTROS_DISPONIBLES.find((f) => f.value === filtroEstado)?.icon || "calendar";

  if (loading && screenMode === "list")
    return <LoadingScreen message="Cargando citas..." />;
  if (error && !data && screenMode === "list")
    return <ErrorMessage message={error} onRetry={() => fetchCitas(1, false)} />;

  // ─── Render principal ──────────────────────────────────────────────────────
  return (
    <Surface style={s.container}>
      {/* ── Dialogs ── */}
      <Portal>
        {/* Filtro por estado */}
        <Dialog
          visible={estadoDialogVisible}
          onDismiss={() => setEstadoDialogVisible(false)}
          style={s.dialog}
        >
          <Dialog.Title>Filtrar por estado</Dialog.Title>
          <Dialog.Content style={s.dialogContent}>
            <RadioButton.Group onValueChange={setFiltroTemp} value={filtroTemp}>
              {FILTROS_DISPONIBLES.map((filtro) => (
                <TouchableOpacity
                  key={filtro.value}
                  style={s.radioRow}
                  onPress={() => setFiltroTemp(filtro.value)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={filtro.icon as any}
                    size={20}
                    color={filtroTemp === filtro.value ? theme.colors.primary : theme.colors.outline}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      s.radioLabel,
                      filtroTemp === filtro.value && {
                        color: theme.colors.primary,
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {filtro.label}
                  </Text>
                  <RadioButton value={filtro.value} />
                </TouchableOpacity>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEstadoDialogVisible(false)}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={() => {
                setFiltroEstado(filtroTemp);
                setEstadoDialogVisible(false);
              }}
            >
              Aplicar
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Rango personalizado */}
        <Dialog
          visible={customDialogVisible}
          onDismiss={() => setCustomDialogVisible(false)}
          style={s.dialog}
        >
          <Dialog.Title>Rango personalizado</Dialog.Title>
          <Dialog.Content>
            <MonthPicker label="Desde" value={customDesde} onChange={setCustomDesde} />
            <MonthPicker label="Hasta" value={customHasta} onChange={setCustomHasta} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCustomDialogVisible(false)}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={() => {
                setDatePreset("custom");
                setCustomDialogVisible(false);
              }}
            >
              Aplicar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── Barra superior ── */}
      <Surface style={s.topBar} elevation={0}>
        {/* Toggle modo */}
        <View style={s.modeToggle}>
          {(["list", "calendar"] as ScreenMode[]).map((mode) => {
            const active = screenMode === mode;
            const locked = mode === "calendar" && !modCalendario;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  s.modeBtn,
                  active && s.modeBtnActive,
                  locked && s.modeBtnLocked,
                ]}
                onPress={() => handleModeChange(mode)}
              >
                <MaterialCommunityIcons
                  name={
                    locked
                      ? "lock-outline"
                      : mode === "list"
                      ? "view-list"
                      : "calendar-month"
                  }
                  size={17}
                  color={
                    locked
                      ? theme.colors.onSurfaceDisabled
                      : active
                      ? theme.colors.secondary
                      : theme.colors.outline
                  }
                />
                <Text
                  style={[
                    s.modeBtnTxt,
                    active && s.modeBtnTxtActive,
                    locked && { color: theme.colors.onSurfaceDisabled },
                  ]}
                >
                  {mode === "list" ? "Listado" : "Calendario"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Chip de estado + contador */}
        <View style={s.topBarRow}>
          <TouchableOpacity
            style={[
              s.filterChip,
              filtroEstado !== "todas" && {
                backgroundColor: theme.colors.primaryContainer,
              },
            ]}
            onPress={() => {
              setFiltroTemp(filtroEstado);
              setEstadoDialogVisible(true);
            }}
          >
            <MaterialCommunityIcons
              name={filtroEstadoIcon as any}
              size={14}
              color={filtroEstado !== "todas" ? theme.colors.primary : theme.colors.outline}
            />
            <Text
              style={[
                s.filterChipText,
                filtroEstado !== "todas" && {
                  color: theme.colors.primary,
                  fontWeight: "600",
                },
              ]}
            >
              {filtroEstadoLabel}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={14}
              color={filtroEstado !== "todas" ? theme.colors.primary : theme.colors.outline}
            />
          </TouchableOpacity>

          {screenMode === "list" && data && (
            <Text style={s.countText}>
              {data.totalItems} cita{data.totalItems !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </Surface>

      {/* ── Chips de rango de fecha (solo listado) ── */}
      {screenMode === "list" && renderDateFilterBar()}

      {/* ── Contenido ── */}
      {screenMode === "calendar" ? (
        <View style={{ flex: 1 }}>
          <Text style={{ paddingHorizontal: 12 }}>Las horas se muestran en la zona horaria de este dispositivo.</Text>
          {calendarLoading && <ActivityIndicator accessibilityLabel="Actualizando calendario" />}
          {!!calendarError && <View><Text accessibilityRole="alert">{calendarError}</Text><Button onPress={refrescarCalendario}>Reintentar</Button></View>}
        <CalendarView
          citas={calendarCitas}
          estadoConfig={ESTADO_CONFIG}
          onCitaPress={(citaId) => navigation.navigate("CitaDetalle", { citaId })}
          onRangeChange={fetchCalendarCitas}
        />
        </View>
      ) : citasSections.length === 0 ? (
        <EmptyState
          icon="calendar-blank"
          title={datePreset !== "todo" ? "Nada en este rango" : "Aún no hay citas"}
          subtitle={
            datePreset !== "todo"
              ? "Prueba cambiar el rango de fechas o el filtro de estado."
              : "Registra una venta o agenda una cita desde Inicio y aparecerá aquí."
          }
          actionLabel={datePreset !== "todo" ? undefined : "Ir a registrar"}
          onAction={datePreset !== "todo" ? undefined : () => navigation.navigate("Dashboard")}
        />
      ) : (
        <SectionList
          sections={citasSections}
          renderItem={renderCita}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={Separador}
          SectionSeparatorComponent={() => <View style={s.sectionSeparator} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          stickySectionHeadersEnabled
        />
      )}
    </Surface>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // ── Top bar ──────────────────────────────────────────────────────────────
    topBar: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      gap: 10,
      backgroundColor: theme.colors.background,
    },
    modeToggle: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 16,
      padding: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    modeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 9,
      borderRadius: 12,
    },
    modeBtnActive: {
      backgroundColor: theme.colors.surface,
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 3,
    },
    modeBtnLocked: { opacity: 0.5 },
    modeBtnTxt: { fontSize: 13, color: theme.colors.outline },
    modeBtnTxtActive: { fontWeight: "700", color: theme.colors.secondary },

    topBarRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
      alignSelf: "flex-start",
    },
    filterChipText: { fontSize: 13, color: theme.colors.outline },
    countText: { fontSize: 12, color: theme.colors.outline },

    // ── Date filter bar ───────────────────────────────────────────────────────
    dateBar: {
      backgroundColor: theme.colors.background,
      minHeight: 48,
      maxHeight: 50,
    },
    dateBarContent: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  gap: 6,
  flexDirection: "row",
  alignItems: "center",
  minHeight: 48, 
        maxHeight: 50,

},
    dateChip: {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 11,
  paddingVertical: 6, 
  borderRadius: 12,
  backgroundColor: theme.colors.surface,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.colors.outlineVariant,
},
    dateChipText: { fontSize: 12, color: theme.colors.outline },

    // ── Section header ────────────────────────────────────────────────────────
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 9,
      backgroundColor: theme.colors.background,
    },
    sectionHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.onSurface,
      textTransform: "capitalize",
    },
    sectionCountBadge: {
      borderRadius: 9,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    sectionCountText: { fontSize: 11, fontWeight: "700" },
    sectionHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sectionTotal: { fontSize: 13, fontWeight: "600" },

    // ── Timeline ───────────────────────────────────────────────────────────────
    timelineRow: {
      flexDirection: "row",
      minHeight: 92,
      backgroundColor: theme.colors.background,
    },
    timelineRail: {
      width: 62,
      alignItems: "center",
      paddingTop: 15,
    },
    timelineTime: {
      color: theme.colors.onSurface,
      fontSize: 12,
      fontWeight: "800",
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 8,
    },
    timelineLine: {
      flex: 1,
      width: StyleSheet.hairlineWidth,
      marginTop: 4,
      backgroundColor: theme.colors.outlineVariant,
    },
    appointmentContent: {
      flex: 1,
      paddingVertical: 14,
      paddingRight: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
    },
    appointmentTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    appointmentTitleBlock: { flex: 1 },
    clienteNombre: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.onSurface,
    },
    servicioPreview: {
      fontSize: 12,
      color: theme.colors.outline,
      marginTop: 3,
    },
    appointmentMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },
    employeeMeta: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    statusInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    statusMiniDot: { width: 6, height: 6, borderRadius: 3 },
    estadoLabel: { fontSize: 10, fontWeight: "700" },
    infoText: { fontSize: 12, color: theme.colors.outline },
    totalText: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.onSurface,
    },

    // ── List ──────────────────────────────────────────────────────────────────
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    separator: { height: 0 },
    sectionSeparator: { height: 10 },

    // ── Empty ─────────────────────────────────────────────────────────────────
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
      backgroundColor: theme.colors.background,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.outline,
      marginTop: 16,
      fontWeight: "600",
    },
    emptySubtext: {
      fontSize: 13,
      color: theme.colors.outline,
      marginTop: 6,
      textAlign: "center",
    },
    loadingMore: { paddingVertical: 16, alignItems: "center" },

    // ── Dialogs ───────────────────────────────────────────────────────────────
    dialog: { borderRadius: 16 },
    dialogContent: { paddingHorizontal: 0 },
    radioRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    radioLabel: { flex: 1, fontSize: 15, color: theme.colors.onSurface },

    // ── Month picker ──────────────────────────────────────────────────────────
    monthPickerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    monthPickerLabel: {
      fontSize: 15,
      color: theme.colors.onSurface,
      fontWeight: "600",
      width: 56,
    },
    monthPickerControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    monthPickerBtn: { padding: 4 },
    monthPickerValue: {
      fontSize: 15,
      color: theme.colors.onSurface,
      minWidth: 96,
      textAlign: "center",
    },
  });
