// La eleccion de calendario es una cadena de seis desempates que el usuario no
// ve. Cuando fallo, los eventos se guardaban en un calendario local y no subian
// nunca a Google, sin ningun aviso. Estos tests fijan ese comportamiento.
import { elegirDeLista } from "../calendario";

/** Campos tal como los devuelve expo-calendar en Android. */
const cal = (over: Record<string, any> = {}) => ({
  id: "1",
  title: "Calendario",
  ownerAccount: "alguien@gmail.com",
  isPrimary: false,
  isSynced: true,
  allowsModifications: true,
  source: { name: "alguien@gmail.com", type: "com.google", isLocalAccount: false },
  ...over,
});

const local = (over: Record<string, any> = {}) =>
  cal({
    id: "99",
    title: "Mis eventos",
    ownerAccount: "",
    source: { name: "Teléfono", type: "LOCAL", isLocalAccount: true },
    ...over,
  });

describe("elegirDeLista", () => {
  it("devuelve null si no hay ni un calendario", () => {
    expect(elegirDeLista([])).toBeNull();
  });

  it("EL BUG: prefiere Google aunque la cuenta se llame @gmail.com, no 'google'", () => {
    // source.name es el correo. La version anterior buscaba "google" ahi y
    // nunca acertaba, cayendo en el calendario local.
    const r = elegirDeLista([local(), cal({ id: "7", isPrimary: true })]);
    expect(r!.destino.id).toBe("7");
    expect(r!.destino.sincronizaConLaNube).toBe(true);
  });

  it("prefiere el principal de Google sobre otro de Google", () => {
    const r = elegirDeLista([
      cal({ id: "2", title: "Cumpleaños" }),
      cal({ id: "3", isPrimary: true }),
    ]);
    expect(r!.destino.id).toBe("3");
  });

  it("sin isPrimary, usa el que se titula como la cuenta", () => {
    const r = elegirDeLista([
      cal({ id: "4", title: "Festivos" }),
      cal({ id: "5", title: "alguien@gmail.com" }),
    ]);
    expect(r!.destino.id).toBe("5");
  });

  it("descarta un calendario de Google con la sincronizacion apagada", () => {
    // isSynced=false (SYNC_EVENTS=0): existe pero el sistema no lo sube.
    const r = elegirDeLista([
      cal({ id: "6", isPrimary: true, isSynced: false }),
      cal({ id: "8" }),
    ]);
    expect(r!.destino.id).toBe("8");
  });

  it("si solo hay local, lo usa pero AVISA de que no sube a la nube", () => {
    const r = elegirDeLista([local()]);
    expect(r!.destino.id).toBe("99");
    expect(r!.destino.sincronizaConLaNube).toBe(false);
    expect(r!.destino.cuenta).toBe("Solo en este teléfono");
  });

  it("respeta lo que el usuario eligio a mano, aunque la heuristica opine otra cosa", () => {
    const r = elegirDeLista([cal({ id: "10", isPrimary: true }), local()], "99");
    expect(r!.destino.id).toBe("99");
    expect(r!.preferidoPerdido).toBe(false);
  });

  it("si el elegido desaparecio (cuenta quitada), avisa para poder limpiarlo", () => {
    const r = elegirDeLista([cal({ id: "10", isPrimary: true })], "borrado-hace-tiempo");
    expect(r!.destino.id).toBe("10");
    expect(r!.preferidoPerdido).toBe(true);
  });

  it("compara los ids como texto: expo-calendar los da como number en algunos casos", () => {
    const r = elegirDeLista([cal({ id: 42 } as any)], "42");
    expect(r!.destino.id).toBe("42");
    expect(r!.preferidoPerdido).toBe(false);
  });

  it("describe la cuenta con ownerAccount para poder enseñarla en Ajustes", () => {
    const r = elegirDeLista([cal({ id: "11", ownerAccount: "trabajo@empresa.com" })]);
    expect(r!.destino.cuenta).toBe("trabajo@empresa.com");
  });
});
