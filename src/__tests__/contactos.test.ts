// limpiarTelefono decide si dos contactos son la misma persona. Si normaliza de
// mas, dos clientes distintos se funden; si normaliza de menos, el mismo cliente
// se duplica cada vez que se importa de la agenda.
import { limpiarTelefono } from "../contactos";

describe("limpiarTelefono", () => {
  it("quita el formato con el que la gente guarda los numeros", () => {
    expect(limpiarTelefono("0412-123 45 67")).toBe("04121234567");
    expect(limpiarTelefono("(0412) 1234567")).toBe("04121234567");
    expect(limpiarTelefono("0412.123.4567")).toBe("04121234567");
  });

  it("conserva el + inicial del formato internacional", () => {
    expect(limpiarTelefono("+58 412 1234567")).toBe("+584121234567");
  });

  it("deja solo el primer +, no uno por cada trozo", () => {
    expect(limpiarTelefono("+58+412+1234567")).toBe("+584121234567");
  });

  it("descarta un + que no vaya al principio", () => {
    expect(limpiarTelefono("0412+1234567")).toBe("04121234567");
  });

  it("aguanta entradas vacias o basura sin reventar", () => {
    expect(limpiarTelefono("")).toBe("");
    expect(limpiarTelefono(undefined as any)).toBe("");
    expect(limpiarTelefono("sin numero")).toBe("");
  });

  it("quita letras y simbolos que Android deja colar en la agenda", () => {
    expect(limpiarTelefono("0412-1234567 (casa)")).toBe("04121234567");
    expect(limpiarTelefono("*123#")).toBe("123");
  });

  it("los ultimos 7 digitos identifican a la persona pese al formato", () => {
    // Es la regla que usa el aviso de duplicados: el mismo numero guardado de
    // tres formas distintas tiene que reconocerse como uno solo.
    const formas = ["0412-1234567", "+584121234567", "(0412) 123 4567"];
    const colas = formas.map((f) => limpiarTelefono(f).replace(/\D/g, "").slice(-7));
    expect(new Set(colas).size).toBe(1);
    expect(colas[0]).toBe("1234567");
  });
});
