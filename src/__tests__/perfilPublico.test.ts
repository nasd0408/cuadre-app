import { parseCoordenadas, validarPerfil } from '../utils/perfilPublico';
import type { PerfilPublico } from '../api/perfilPublico';

describe('coordenadas de locales', () => {
  it('conserva la ausencia de GPS y no la convierte en el punto 0,0', () => {
    expect(parseCoordenadas(' ', '')).toEqual({ latitud: null, longitud: null });
  });
  it('acepta decimales con coma, valores negativos y cero', () => {
    expect(parseCoordenadas('28,4636', '-16.2518')).toEqual({ latitud: 28.4636, longitud: -16.2518 });
    expect(parseCoordenadas('0', '0')).toEqual({ latitud: 0, longitud: 0 });
  });
  it.each([['28', ''], ['', '-16'], ['91', '0'], ['0', '-181'], ['NaN', '0'], ['0x10', '0'], ['1e2', '0']])(
    'rechaza coordenadas inválidas (%s, %s)', (lat, lon) => expect(() => parseCoordenadas(lat, lon)).toThrow(),
  );
});

describe('perfil público', () => {
  const perfil: PerfilPublico = { nombre: 'Salón', categoria: 'Belleza', descripcion: null,
    telefonoPublico: null, instagram: '@salon', facebook: null, tikTok: null, publicado: false };
  it('admite redes y contacto opcionales', () => expect(validarPerfil(perfil)).toBeNull());
  it('rechaza enlaces completos como usuarios de redes', () => {
    expect(validarPerfil({ ...perfil, instagram: 'https://instagram.com/salon' })).toContain('Instagram');
  });
  it('exige nombre y categoría con contenido', () => {
    expect(validarPerfil({ ...perfil, nombre: ' ' })).not.toBeNull();
    expect(validarPerfil({ ...perfil, categoria: '' })).not.toBeNull();
  });
});
