// La cola offline es el UNICO dato de la app que no se puede recuperar del
// servidor: si se pierde, el barbero pierde ventas ya hechas.
//
// El fallo que estos tests fijan: loadQueue() sin scope leia la clave legacy
// "@offline_queue" en vez de "@offline_queue:{empresa}:{usuario}". Las citas
// creadas en esa ventana se guardaban ahi, y como la migracion a la clave con
// scope solo corre si esta VACIA, quedaban huerfanas y no sincronizaban nunca.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOfflineQueueStore } from "../stores/offlineQueueStore";

const SCOPE = "7:usuario-abc";
const CLAVE_SCOPE = `@offline_queue:${SCOPE}`;
const CLAVE_LEGACY = "@offline_queue";

const citaGuardada = (id: string) => ({
  id,
  tipo: "pagada",
  clienteNombre: "Ana",
  empleadoId: 1,
  servicios: [],
  creadoEn: new Date().toISOString(),
  sincronizado: false,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  useOfflineQueueStore.getState().reset();
});

describe("offlineQueueStore: scope", () => {
  it("sin scope NO carga nada, en vez de leer la clave legacy", async () => {
    await AsyncStorage.setItem(
      CLAVE_LEGACY,
      JSON.stringify([citaGuardada("de-otra-cuenta")]),
    );

    await useOfflineQueueStore.getState().loadQueue();

    expect(useOfflineQueueStore.getState().queue).toEqual([]);
    expect(useOfflineQueueStore.getState().scope).toBeNull();
  });

  it("con scope carga de la clave de esa cuenta", async () => {
    await AsyncStorage.setItem(
      CLAVE_SCOPE,
      JSON.stringify([citaGuardada("propia")]),
    );

    await useOfflineQueueStore.getState().loadQueue(SCOPE);

    const { queue, scope } = useOfflineQueueStore.getState();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("propia");
    expect(scope).toBe(SCOPE);
  });

  it("migra una cola legacy solo si la de la cuenta esta vacia", async () => {
    await AsyncStorage.setItem(
      CLAVE_LEGACY,
      JSON.stringify([citaGuardada("de-antes-de-los-scopes")]),
    );

    await useOfflineQueueStore.getState().loadQueue(SCOPE);

    expect(useOfflineQueueStore.getState().queue).toHaveLength(1);
    // Se movio, no se copio: si no, se sincronizaria dos veces.
    expect(await AsyncStorage.getItem(CLAVE_LEGACY)).toBeNull();
    expect(await AsyncStorage.getItem(CLAVE_SCOPE)).not.toBeNull();
  });

  it("no pisa la cola de la cuenta con la legacy", async () => {
    // Este es el caso en el que se perdian citas: habia datos en las dos claves.
    await AsyncStorage.setItem(CLAVE_SCOPE, JSON.stringify([citaGuardada("propia")]));
    await AsyncStorage.setItem(CLAVE_LEGACY, JSON.stringify([citaGuardada("vieja")]));

    await useOfflineQueueStore.getState().loadQueue(SCOPE);

    const { queue } = useOfflineQueueStore.getState();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("propia");
  });

  it("una cola corrupta no revienta la app", async () => {
    await AsyncStorage.setItem(CLAVE_SCOPE, "{ esto no es json");

    await useOfflineQueueStore.getState().loadQueue(SCOPE);

    expect(useOfflineQueueStore.getState().queue).toEqual([]);
    expect(useOfflineQueueStore.getState().loading).toBe(false);
  });

  it("addCita persiste contra la clave de la cuenta, no la legacy", async () => {
    await useOfflineQueueStore.getState().loadQueue(SCOPE);

    await useOfflineQueueStore.getState().addCita({
      tipo: "pagada",
      clienteNombre: "Nueva",
      empleadoId: 1,
      servicios: [],
    } as any);

    expect(await AsyncStorage.getItem(CLAVE_LEGACY)).toBeNull();
    const guardado = await AsyncStorage.getItem(CLAVE_SCOPE);
    expect(guardado).toContain("Nueva");
  });
});
