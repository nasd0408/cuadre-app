import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text, Surface, Chip, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CitaResponse } from "../../types";
import { distribuirCitas, duracionCita, moverFechaAgenda, rangoAgenda } from '../../utils/agenda';
import { localDateString } from '../../utils/datetime';

// ─── Constantes ─────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64; // px por hora en vistas semana/día
const START_HOUR = 0;
const END_HOUR = 24;
const TIME_LABEL_WIDTH = 48;

type ViewMode = "month" | "week" | "day";

interface Props {
  citas: CitaResponse[];
  estadoConfig: Record<
    number,
    { label: string; color: string; colorContainer: string; icon: string }
  >;
  onCitaPress: (citaId: number) => void;
  onRangeChange?: (from: Date, to: Date) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, n: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const formatHour = (h: number) => {
  const period = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${period}`;
};

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CalendarView({
  citas,
  estadoConfig,
  onCitaPress,
  onRangeChange,
}: Props) {
  const theme = useTheme() as any;
  const s = useMemo(() => makeStyles(theme), [theme]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date(today));
  const timeScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const { from, to } = rangoAgenda(currentDate, viewMode);
    onRangeChange?.(from, to);
  }, [currentDate, viewMode, onRangeChange]);

  // Scroll automático a la hora actual en week/day
  useEffect(() => {
    if (viewMode === "month") return;

    const nowHour = new Date().getHours();
    const offset = Math.max(0, nowHour - START_HOUR - 1) * HOUR_HEIGHT;
    const temporizador = setTimeout(
      () => timeScrollRef.current?.scrollTo({ y: offset, animated: true }),
      300,
    );

    // Sin limpiar, cambiar de vista o salir antes de los 300 ms deja el timer
    // vivo y hace scroll sobre una referencia ya desmontada.
    return () => clearTimeout(temporizador);
  }, [viewMode]);

  // Agrupar citas por fecha local (YYYY-MM-DD)
  const citasByDay = useMemo(() => {
    const map: Record<string, CitaResponse[]> = {};
    citas.forEach((c) => {
      const key = localDateString(new Date(c.fecha));
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });

    // Se ordena UNA VEZ aqui, al construir el mapa.
    //
    // Antes lo hacia getCitasForDay con .sort(), que ordena EN SITIO: mutaba el
    // array guardado en este useMemo en cada render, que es justo lo que un memo
    // no debe permitir. Ademas reordenaba lo ya ordenado en cada pintada.
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      );
    }

    return map;
  }, [citas]);

  const getCitasForDay = (date: Date): CitaResponse[] =>
    citasByDay[localDateString(date)] || [];

  // ─── Navegación ────────────────────────────────────────────────────────────
  const navigate = (dir: 1 | -1) => {
    setCurrentDate(moverFechaAgenda(currentDate, viewMode, dir));
  };

  const goToDay = (date: Date) => {
    setCurrentDate(new Date(date));
    setViewMode("day");
  };

  // ─── Header ────────────────────────────────────────────────────────────────
  const getHeaderTitle = () => {
    if (viewMode === "month")
      return `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth())
        return `${ws.getDate()}–${we.getDate()} ${MESES[ws.getMonth()]} ${ws.getFullYear()}`;
      return `${ws.getDate()} ${MESES[ws.getMonth()]} – ${we.getDate()} ${MESES[we.getMonth()]}`;
    }
    return `${currentDate.getDate()} de ${MESES[currentDate.getMonth()]}, ${currentDate.getFullYear()}`;
  };

  const renderHeader = () => (
    <Surface style={s.calHeader} elevation={0}>
      {/* Título + navegación */}
      <View style={s.navRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Período anterior" style={s.navBtn} onPress={() => navigate(-1)}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Ir a hoy"
          onPress={() => {
            setCurrentDate(new Date(today));
          }}
        >
          <Text style={s.headerTitle}>{getHeaderTitle()}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Período siguiente" style={s.navBtn} onPress={() => navigate(1)}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      {/* Selector de vista */}
      <View style={s.viewModeRow}>
        {(["month", "week", "day"] as ViewMode[]).map((mode) => {
          const labels = { month: "Mes", week: "Semana", day: "Día" };
          const active = viewMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={`Vista ${labels[mode].toLowerCase()}`}
              accessibilityState={{ selected: active }}
              style={[s.viewModeBtn, active && s.viewModeBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[s.viewModeTxt, active && s.viewModeTxtActive]}>
                {labels[mode]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Surface>
  );

  // ─── Vista Mes ─────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const cells: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
    while (cells.length < totalCells) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Encabezado días */}
        <View style={s.weekDaysHeader}>
          {DIAS_CORTOS.map((d) => (
            <Text key={d} style={s.weekDayLabel}>
              {d}
            </Text>
          ))}
        </View>

        {rows.map((row, ri) => (
          <View key={ri} style={s.monthRow}>
            {row.map((date, ci) => {
              if (!date) return <View key={ci} style={s.monthCell} />;
              const dayCitas = getCitasForDay(date);
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, currentDate);

              return (
                <TouchableOpacity
                  key={ci}
                  style={s.monthCell}
                  onPress={() => goToDay(date)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.dayNumberContainer,
                      isToday && s.todayCircle,
                      isSelected && !isToday && s.selectedCircle,
                    ]}
                  >
                    <Text
                      style={[
                        s.dayNumber,
                        isToday && s.todayDayNumber,
                        date.getMonth() !== month && s.otherMonthDay,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>

                  {/* Dots de citas */}
                  {dayCitas.length > 0 && (
                    <View style={s.dotsContainer}>
                      {dayCitas.slice(0, 3).map((c, idx) => {
                        const cfg = estadoConfig[c.estado];
                        return (
                          <View
                            key={idx}
                            style={[
                              s.dot,
                              {
                                backgroundColor:
                                  cfg?.color || theme.colors.primary,
                              },
                            ]}
                          />
                        );
                      })}
                      {dayCitas.length > 3 && (
                        <Text style={s.moreDots}>+{dayCitas.length - 3}</Text>
                      )}
                    </View>
                  )}

                  {/* Preview de hasta 2 eventos */}
                  {dayCitas.slice(0, 2).map((c, idx) => {
                    const cfg = estadoConfig[c.estado];
                    return (
                      <View
                        key={idx}
                        style={[
                          s.monthEventPill,
                          {
                            backgroundColor:
                              cfg?.colorContainer ||
                              theme.colors.primaryContainer,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.monthEventText,
                            { color: cfg?.color || theme.colors.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {new Date(c.fecha).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          {c.clienteNombre.split(" ")[0]}
                        </Text>
                      </View>
                    );
                  })}
                  {dayCitas.length > 2 && (
                    <Text style={s.moreEvents}>+{dayCitas.length - 2} más</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  // ─── Vista Semana ──────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const ws = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const hours = Array.from(
      { length: END_HOUR - START_HOUR },
      (_, i) => START_HOUR + i,
    );
    const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
    const nowOffset = (nowHour - START_HOUR) * HOUR_HEIGHT;

    return (
      <View style={{ flex: 1 }}>
        {/* Header días */}
        <View style={[s.weekHeader, { paddingLeft: TIME_LABEL_WIDTH }]}>
          {weekDays.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <TouchableOpacity
                key={i}
                style={[s.weekHeaderCell, { flex: 1, minWidth: 0 }]}
                onPress={() => goToDay(d)}
              >
                <Text
                  style={[
                    s.weekHeaderDay,
                    isToday && { color: theme.colors.primary },
                  ]}
                >
                  {DIAS_CORTOS[d.getDay()]}
                </Text>
                <View
                  style={[
                    s.weekHeaderDateCircle,
                    isToday && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[s.weekHeaderDate, isToday && { color: "#fff" }]}
                  >
                    {d.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView ref={timeScrollRef} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row" }}>
            {/* Etiquetas de hora */}
            <View style={{ width: TIME_LABEL_WIDTH }}>
              {hours.map((h) => (
                <View key={h} style={[s.timeSlot, { height: HOUR_HEIGHT }]}>
                  <Text style={s.timeLabel}>{formatHour(h)}</Text>
                </View>
              ))}
            </View>

            {/* Grid + eventos */}
            <View style={{ flex: 1, flexDirection: "row" }}>
              {weekDays.map((day, di) => {
                const dayCitas = getCitasForDay(day);
                const isToday = isSameDay(day, today);
                return (
                  <View
                    key={di}
                    style={{ flex: 1, minWidth: 0, position: "relative" }}
                  >
                    {/* Líneas de hora */}
                    {hours.map((h) => (
                      <View
                        key={h}
                        style={[
                          s.hourLine,
                          { top: (h - START_HOUR) * HOUR_HEIGHT },
                        ]}
                      />
                    ))}
                    {/* Línea de ahora */}
                    {isToday && nowOffset > 0 && (
                      <View style={[s.nowLine, { top: nowOffset }]}>
                        <View style={s.nowDot} />
                      </View>
                    )}
                    {/* Eventos */}
                    {distribuirCitas(dayCitas).map(({ cita: c, columna, columnas }) => {
                      const d = new Date(c.fecha);
                      const eventH = d.getHours() + d.getMinutes() / 60;
                      if (eventH < START_HOUR || eventH >= END_HOUR)
                        return null;
                      const top = (eventH - START_HOUR) * HOUR_HEIGHT;
                      const height = Math.min(duracionCita(c.servicios) / 60, END_HOUR - eventH) * HOUR_HEIGHT;
                      const cfg = estadoConfig[c.estado];
                      return (
                        <TouchableOpacity
                          key={c.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${c.clienteNombre}, ${c.empleadoNombre}, ${d.toLocaleTimeString('es-MX')}`}
                          style={[
                            s.weekEvent,
                            {
                              top,
                              height,
                              backgroundColor:
                                cfg?.colorContainer ||
                                theme.colors.primaryContainer,
                              borderLeftColor:
                                cfg?.color || theme.colors.primary,
                              left: `${columna * 100 / columnas}%`,
                              width: `${100 / columnas}%`,
                            },
                          ]}
                          onPress={() => onCitaPress(c.id)}
                        >
                          <Text
                            style={[s.weekEventTime, { color: cfg?.color }]}
                            numberOfLines={1}
                          >
                            {d.toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                          <Text
                            style={[s.weekEventName, { color: cfg?.color }]}
                            numberOfLines={1}
                          >
                            {c.clienteNombre.split(" ")[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {/* Fondo total de horas */}
                    <View
                      style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ─── Vista Día ─────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const dayCitas = getCitasForDay(currentDate);
    const hours = Array.from(
      { length: END_HOUR - START_HOUR },
      (_, i) => START_HOUR + i,
    );
    const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
    const nowOffset = (nowHour - START_HOUR) * HOUR_HEIGHT;
    const isToday = isSameDay(currentDate, today);

    return (
      <ScrollView ref={timeScrollRef} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row" }}>
          {/* Etiquetas de hora */}
          <View style={{ width: TIME_LABEL_WIDTH }}>
            {hours.map((h) => (
              <View key={h} style={[s.timeSlot, { height: HOUR_HEIGHT }]}>
                <Text style={s.timeLabel}>{formatHour(h)}</Text>
              </View>
            ))}
          </View>

          {/* Columna de eventos */}
          <View style={{ flex: 1, position: "relative" }}>
            {/* Líneas de hora */}
            {hours.map((h) => (
              <View
                key={h}
                style={[
                  s.hourLineFull,
                  { top: (h - START_HOUR) * HOUR_HEIGHT },
                ]}
              />
            ))}

            {/* Línea "ahora" */}
            {isToday && nowOffset > 0 && (
              <View style={[s.nowLine, { top: nowOffset }]}>
                <View style={s.nowDot} />
              </View>
            )}

            {/* Eventos */}
            {distribuirCitas(dayCitas).map(({ cita: c, columna, columnas }) => {
              const d = new Date(c.fecha);
              const eventH = d.getHours() + d.getMinutes() / 60;
              if (eventH < START_HOUR || eventH >= END_HOUR) return null;
              const top = (eventH - START_HOUR) * HOUR_HEIGHT;
              const height = Math.min(duracionCita(c.servicios) / 60, END_HOUR - eventH) * HOUR_HEIGHT;
              const cfg = estadoConfig[c.estado];
              return (
                <TouchableOpacity
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.clienteNombre}, ${c.empleadoNombre}, ${d.toLocaleTimeString('es-MX')}`}
                  style={[
                    s.dayEvent,
                    {
                      top,
                      height,
                      left: `${columna * 100 / columnas}%`,
                      width: `${100 / columnas}%`,
                      right: undefined,
                      paddingVertical: height < 52 ? 1 : 5,
                      backgroundColor:
                        cfg?.colorContainer || theme.colors.primaryContainer,
                      borderLeftColor: cfg?.color || theme.colors.primary,
                    },
                  ]}
                  onPress={() => onCitaPress(c.id)}
                >
                  {height < 52 ? <Text numberOfLines={1} style={[s.dayEventTime, { color: cfg?.color }]}>
                    {d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} {c.clienteNombre}
                  </Text> : <>
                  <View style={s.dayEventHeader}>
                    <Text style={[s.dayEventTime, { color: cfg?.color }]}>
                      {d.toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Chip
                      mode="flat"
                      style={[
                        s.dayEventChip,
                        { backgroundColor: cfg?.colorContainer },
                      ]}
                      textStyle={{ color: cfg?.color, fontSize: 10 }}
                      compact
                    >
                      {cfg?.label}
                    </Chip>
                  </View>
                  <Text
                    style={[s.dayEventClient, { color: cfg?.color }]}
                    numberOfLines={1}
                  >
                    {c.clienteNombre}
                  </Text>
                  {height >= 80 && <Text style={s.dayEventService} numberOfLines={1}>
                    {c.servicios[0]?.servicioNombre}
                    {c.servicios.length > 1
                      ? ` +${c.servicios.length - 1}`
                      : ""}
                  </Text>}
                  {height >= 100 && <Text style={s.dayEventEmployee} numberOfLines={1}>
                    <MaterialCommunityIcons
                      name="content-cut"
                      size={11}
                      color="#999"
                    />{" "}
                    {c.empleadoNombre}
                  </Text>}
                  </>}
                </TouchableOpacity>
              );
            })}

            {/* Fondo */}
            <View style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }} />
          </View>
        </View>


      </ScrollView>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {renderHeader()}
      <View style={{ flex: 1 }}>
        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}
      </View>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1 },

    // Header
    calHeader: {
      paddingTop: 8,
      paddingBottom: 4,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
    },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    navBtn: { padding: 4 },
    headerTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onSurface,
    },
    viewModeRow: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      padding: 2,
      marginBottom: 8,
      alignSelf: "center",
    },
    viewModeBtn: {
      paddingHorizontal: 20,
      paddingVertical: 6,
      borderRadius: 8,
    },
    viewModeBtnActive: {
      backgroundColor: theme.colors.surface,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 3,
      elevation: 2,
    },
    viewModeTxt: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
    },
    viewModeTxtActive: {
      fontWeight: "600",
      color: theme.colors.onSurface,
    },

    // Mes
    weekDaysHeader: {
      flexDirection: "row",
      paddingHorizontal: 4,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
    },
    weekDayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.outline,
    },
    monthRow: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
    },
    monthCell: {
      flex: 1,
      minHeight: 90,
      padding: 3,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.colors.outlineVariant,
    },
    dayNumberContainer: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2,
    },
    todayCircle: { backgroundColor: theme.colors.primary },
    selectedCircle: { backgroundColor: theme.colors.primaryContainer },
    dayNumber: { fontSize: 12, color: theme.colors.onSurface },
    todayDayNumber: { color: "#fff", fontWeight: "700" },
    otherMonthDay: { color: theme.colors.outline },
    dotsContainer: {
      flexDirection: "row",
      gap: 2,
      marginBottom: 2,
      flexWrap: "wrap",
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    moreDots: { fontSize: 9, color: theme.colors.outline },
    monthEventPill: {
      borderRadius: 3,
      paddingHorizontal: 3,
      paddingVertical: 1,
      marginBottom: 1,
    },
    monthEventText: { fontSize: 10, fontWeight: "500" },
    moreEvents: { fontSize: 10, color: theme.colors.outline, marginTop: 1 },

    // Week header
    weekHeader: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
      paddingVertical: 6,
    },
    weekHeaderCell: { alignItems: "center" },
    weekHeaderDay: {
      fontSize: 11,
      color: theme.colors.outline,
      marginBottom: 2,
    },
    weekHeaderDateCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    weekHeaderDate: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.onSurface,
    },

    // Time grid
    timeSlot: { justifyContent: "flex-start", paddingTop: 0 },
    timeLabel: {
      fontSize: 10,
      color: theme.colors.outline,
      textAlign: "right",
      paddingRight: 6,
      marginTop: -6,
    },
    hourLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outlineVariant,
    },
    hourLineFull: {
      position: "absolute",
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outlineVariant,
    },
    nowLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: theme.colors.error,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 10,
    },
    nowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.error,
      marginLeft: -4,
    },

    // Week event
    weekEvent: {
      position: "absolute",
      borderRadius: 4,
      borderLeftWidth: 3,
      paddingHorizontal: 3,
      paddingVertical: 2,
      overflow: "hidden",
      zIndex: 5,
    },
    weekEventTime: { fontSize: 9, fontWeight: "600" },
    weekEventName: { fontSize: 10 },

    // Day event
    dayEvent: {
      position: "absolute",
      left: 4,
      right: 8,
      borderRadius: 6,
      borderLeftWidth: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      overflow: "hidden",
      zIndex: 5,
    },
    dayEventHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 2,
    },
    dayEventTime: { fontSize: 11, fontWeight: "700" },
    dayEventChip: { height: 18 },
    dayEventClient: { fontSize: 13, fontWeight: "600", marginBottom: 1 },
    dayEventService: {
      fontSize: 11,
      color: theme.colors.outline,
      marginBottom: 1,
    },
    dayEventEmployee: { fontSize: 11, color: theme.colors.outline },


  });
