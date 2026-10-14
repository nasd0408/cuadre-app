// Mocks de los modulos nativos que no existen en Node.
//
// La app carga sus SDK nativos con require diferido dentro de try/catch, asi que
// en los tests fallan solos y devuelven null, que es justo el camino que se
// quiere probar. AsyncStorage es la excepcion: se importa de forma estatica
// porque es la unica dependencia nativa que la logica pura necesita.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
