// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "node_modules/*"],
  },
  {
    // Los ficheros de test corren en Node bajo Jest, no en React Native: sin
    // esto, `jest`, `describe` y `expect` se ven como variables inexistentes.
    files: ["**/__tests__/**/*.{ts,tsx}", "jest.setup.js"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        require: "readonly",
      },
    },
  },
  {
    rules: {
      // ── Lo que de verdad importa aquí ──

      // Ya cazó tres bugs reales que tsc no ve: un useCallback colocado después
      // de un `return` temprano. En runtime eso desordena los hooks y rompe la
      // pantalla; en compilación no se nota.
      "react-hooks/rules-of-hooks": "error",

      // Los cinco timers sin limpiar y las dependencias mal declaradas que hubo
      // que arreglar a mano salían de aquí. Como aviso, no como error: hay casos
      // legítimos de omitir una dependencia y convertirlo en error obligaría a
      // silenciarlo caso por caso.
      "react-hooks/exhaustive-deps": "warn",

      // ── Desactivado a propósito ──

      // El `require()` diferido dentro de try/catch NO es un descuido: es el
      // patrón que mantiene la app viva. Los SDK nativos (ads, firebase,
      // contactos, calendario, google-signin) resuelven módulos nativos al
      // importarse, así que un `import` estático tumba Expo Go y rompe el bundle
      // de web. Son ~80 avisos que, dejados activos, harían que nadie mire la
      // salida del linter.
      "@typescript-eslint/no-require-imports": "off",

      // Las comillas dobles dentro de un texto en español son correctas y se ven
      // bien; escaparlas como &quot; hace el código ilegible sin ganar nada.
      "react/no-unescaped-entities": "off",

      // forwardRef sin displayName solo afecta al nombre en las herramientas de
      // desarrollo. No justifica ruido.
      "react/display-name": "off",

      // no-unused-vars se deja como lo trae eslint-config-expo (aviso). Anadir
      // aqui una regla con prefijo "@typescript-eslint/" rompe la config plana:
      // el plugin tiene que declararse en el MISMO objeto que la regla, y aqui no
      // esta. `expo lint` lo disimulaba; `npx eslint .` no.
    },
  },
]);
