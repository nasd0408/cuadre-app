// La regla que decide si una respuesta puede escribir en pantalla. Se equivoca
// de dos formas, y las dos ya pasaban en la app:
//
//   - deja pasar una respuesta vieja  -> los filtros de Citas mostraban el rango
//     equivocado, porque ganaba la que llegaba antes y no la ultima pedida
//   - deja pasar tras desmontar       -> setState sobre una pantalla muerta
import { respuestaVigente } from "../hooks/useCargaCancelable";

describe("respuestaVigente", () => {
  it("acepta la respuesta de la ultima peticion", () => {
    expect(respuestaVigente(3, 3, true)).toBe(true);
  });

  it("descarta una respuesta vieja aunque llegue despues", () => {
    // Tocar "hoy" (1) y luego "semana" (2): si la de "hoy" tarda mas, llega la
    // ultima y no debe pisar lo que el usuario pidio de verdad.
    expect(respuestaVigente(1, 2, true)).toBe(false);
  });

  it("descarta cualquier respuesta si la pantalla se desmonto", () => {
    expect(respuestaVigente(2, 2, false)).toBe(false);
  });

  it("descarta una vieja Y desmontada", () => {
    expect(respuestaVigente(1, 5, false)).toBe(false);
  });

  it("la primera peticion de una pantalla montada pasa", () => {
    expect(respuestaVigente(1, 1, true)).toBe(true);
  });
});
