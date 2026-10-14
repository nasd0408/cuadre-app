// Paleta de marca (landing). Las pantallas de auth usan SIEMPRE la estética
// clara de marca, independiente del tema claro/oscuro del sistema.
export const BRAND = {
  greenDeep: "#123d06",
  green: "#2f6f19",
  lime: "#a8df45",
  pink: "#a93563",
  pinkSoft: "#fce1eb",
  orange: "#ac480f",
  orangeSoft: "#ffe0d0",
  paper: "#f7f7ef",
  ink: "#171b16",
  white: "#fffef8",
  line: "rgba(23,27,22,0.16)",
  muted: "rgba(23,27,22,0.62)",
};

// Fuerza colores claros en los inputs de auth (legibles aunque el sistema esté
// en modo oscuro).
export const INPUT_THEME = {
  colors: {
    primary: BRAND.green,
    onSurfaceVariant: BRAND.muted,
    background: BRAND.white,
  },
};
