// mensajeDeError esta en el camino de error de login, registro y borrado de
// cuenta. Si devuelve un objeto, el usuario ve "[object Object]" en el momento
// exacto en que algo ya le fallo.
import { mensajeDeError } from "../utils/alert";

const RESPALDO = "Algo salió mal";

/** Imita la forma de un error de Axios sin arrastrar la libreria al test. */
const errorAxios = (data: unknown, message = "Request failed with status code 400") =>
  Object.assign(new Error(message), { response: { data } });

describe("mensajeDeError", () => {
  it("usa el texto plano de ASP.NET (BadRequest(\"...\"))", () => {
    expect(mensajeDeError(errorAxios("El correo ya está registrado"), RESPALDO))
      .toBe("El correo ya está registrado");
  });

  it("recorta los espacios del texto plano", () => {
    expect(mensajeDeError(errorAxios("  Cuenta bloqueada  "), RESPALDO))
      .toBe("Cuenta bloqueada");
  });

  it("lee message, error y title de un ProblemDetails", () => {
    expect(mensajeDeError(errorAxios({ message: "Sin permisos" }), RESPALDO)).toBe("Sin permisos");
    expect(mensajeDeError(errorAxios({ error: "Token vencido" }), RESPALDO)).toBe("Token vencido");
    expect(mensajeDeError(errorAxios({ title: "Conflicto" }), RESPALDO)).toBe("Conflicto");
  });

  it("saca el primer mensaje del diccionario de validacion de ASP.NET", () => {
    const data = { errors: { Email: ["El correo no es válido"], Password: ["Muy corta"] } };
    expect(mensajeDeError(errorAxios(data), RESPALDO)).toBe("El correo no es válido");
  });

  it("NUNCA devuelve un objeto, que es el bug que causaba [object Object]", () => {
    const casos = [
      errorAxios({ algo: { anidado: true } }),
      errorAxios([1, 2, 3]),
      errorAxios(null),
      errorAxios(undefined),
      new Error(""),
      "no soy un error",
      null,
      undefined,
      42,
    ];
    for (const caso of casos) {
      expect(typeof mensajeDeError(caso, RESPALDO)).toBe("string");
    }
  });

  it("cae al respaldo con el mensaje tecnico de Axios, que no dice nada al usuario", () => {
    expect(mensajeDeError(errorAxios(null), RESPALDO)).toBe(RESPALDO);
  });

  it("usa error.message cuando es util (fallo de red, sin respuesta)", () => {
    expect(mensajeDeError(new Error("Network Error"), RESPALDO)).toBe("Network Error");
  });

  it("ignora un data vacio o en blanco y usa el respaldo", () => {
    expect(mensajeDeError(errorAxios("   "), RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError(errorAxios({ message: "" }), RESPALDO)).toBe(RESPALDO);
  });
});
