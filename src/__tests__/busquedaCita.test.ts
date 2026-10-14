// Lógica compartida por los dos modales de acción rápida, que antes estaba
// duplicada palabra por palabra. Se prueba UNA vez en lugar de cero veces dos.
//
// Importa porque es la ruta por la que entra todo el dinero del negocio: si el
// buscador no encuentra a un cliente, el barbero lo crea duplicado; si el total
// se calcula mal, se cobra mal.
import {
  calcularTotal,
  filtrarClientes,
  filtrarEmpleados,
  filtrarServicios,
  MAX_SERVICIOS,
} from "../utils/busquedaCita";
import { Cliente, Empleado, Servicio } from "../types";

const cliente = (id: number, nombre: string, telefono?: string) =>
  ({ id, nombre, telefono, activo: true }) as Cliente;

const empleado = (id: number, nombre: string) =>
  ({ id, nombre, activo: true }) as Empleado;

const servicio = (id: number, nombre: string, precio: number, categoria?: string) =>
  ({ id, nombre, precio, categoria, activo: true }) as Servicio;

describe("calcularTotal", () => {
  const catalogo = [
    servicio(1, "Corte", 10),
    servicio(2, "Barba", 5.5),
    servicio(3, "Tinte", 20),
  ];

  it("suma solo los servicios elegidos", () => {
    expect(calcularTotal(catalogo, [1, 3])).toBe(30);
  });

  it("sin selección el total es cero, no NaN", () => {
    expect(calcularTotal(catalogo, [])).toBe(0);
  });

  it("no revienta si el id elegido ya no está en el catálogo", () => {
    // Pasa si el dueño desactiva un servicio con el modal abierto.
    expect(calcularTotal(catalogo, [1, 999])).toBe(10);
  });

  it("suma decimales", () => {
    expect(calcularTotal(catalogo, [1, 2])).toBe(15.5);
  });

  it("un id repetido no cobra dos veces", () => {
    // La UI usa un toggle, pero el contrato tiene que ser explícito.
    expect(calcularTotal(catalogo, [1, 1])).toBe(10);
  });
});

describe("filtrarClientes", () => {
  const lista = [
    cliente(1, "Ana Pérez", "04121234567"),
    cliente(2, "Ana María", "04249876543"),
    cliente(3, "Carlos Ruiz"),
  ];

  it("con búsqueda vacía devuelve vacío, para que la UI muestre recientes", () => {
    expect(filtrarClientes(lista, "")).toEqual([]);
    expect(filtrarClientes(lista, "   ")).toEqual([]);
  });

  it("busca por nombre sin distinguir mayúsculas", () => {
    expect(filtrarClientes(lista, "ANA")).toHaveLength(2);
  });

  it("busca por teléfono", () => {
    const r = filtrarClientes(lista, "0424");
    expect(r).toHaveLength(1);
    expect(r[0].nombre).toBe("Ana María");
  });

  it("no revienta con clientes sin teléfono", () => {
    expect(filtrarClientes(lista, "carlos")).toHaveLength(1);
  });

  it("respeta el tope de resultados", () => {
    const muchos = Array.from({ length: 50 }, (_, i) => cliente(i, `Cliente ${i}`));
    expect(filtrarClientes(muchos, "cliente")).toHaveLength(10);
  });
});

describe("filtrarEmpleados", () => {
  const lista = [empleado(1, "José"), empleado(2, "María")];

  it("encuentra por nombre parcial", () => {
    expect(filtrarEmpleados(lista, "os")).toHaveLength(1);
  });

  it("con búsqueda vacía devuelve vacío", () => {
    expect(filtrarEmpleados(lista, "")).toEqual([]);
  });
});

describe("filtrarServicios", () => {
  const lista = [
    servicio(1, "Corte de cabello", 10, "Cabello"),
    servicio(2, "Manicure", 15, "Uñas"),
    servicio(3, "Sin categoría", 5),
  ];

  it("busca por nombre", () => {
    expect(filtrarServicios(lista, "corte")).toHaveLength(1);
  });

  it("busca también por categoría", () => {
    const r = filtrarServicios(lista, "uñas");
    expect(r).toHaveLength(1);
    expect(r[0].nombre).toBe("Manicure");
  });

  it("no revienta con servicios sin categoría", () => {
    expect(filtrarServicios(lista, "sin")).toHaveLength(1);
  });

  it("respeta su propio tope, mayor que el de clientes", () => {
    const muchos = Array.from({ length: 60 }, (_, i) => servicio(i, `Servicio ${i}`, 1));
    expect(filtrarServicios(muchos, "servicio")).toHaveLength(MAX_SERVICIOS);
  });
});
