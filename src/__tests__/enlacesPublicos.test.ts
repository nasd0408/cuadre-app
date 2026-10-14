import { empresaDesdeHash, enlaceEmpresa, enlaceMapa, enlaceRed } from '../utils/enlacesPublicos';

it('reconoce solo identificadores positivos compatibles con el backend', () => {
  expect(empresaDesdeHash('#/empresa/123')).toBe(123);
  for (const hash of ['#/empresa/0', '#/empresa/-1', '#/empresa/1.5', '#/empresa/2147483648', '#/empresa/123/otro'])
    expect(empresaDesdeHash(hash)).toBeNull();
});
it('genera enlaces bajo /app/ sin cambiar el servidor', () => {
  expect(enlaceEmpresa(12, undefined, 'https://example.com/api')).toBe('https://example.com/app/#/empresa/12');
  expect(enlaceEmpresa(12, 'http://localhost:8081/?token=secreto#/otro')).toBe('http://localhost:8081/#/empresa/12');
  expect(enlaceEmpresa(12, 'javascript:alert(1)')).toBeNull();
  expect(enlaceEmpresa(0, 'https://example.com/app/')).toBeNull();
});
it('solo construye enlaces de redes sobre los dominios previstos', () => {
  expect(enlaceRed('tikTok', '@salon')).toBe('https://www.tiktok.com/@salon');
  expect(enlaceRed('instagram', 'https://evil.example')).toBeNull();
});
it('no interpreta GPS ausente como cero y conserva coordenadas cero válidas', () => {
  expect(enlaceMapa(null, null)).toBeNull();
  expect(enlaceMapa(0, null)).toBeNull();
  expect(enlaceMapa(91, 0)).toBeNull();
  expect(enlaceMapa(0, 0)).toContain('query=0%2C0');
});
