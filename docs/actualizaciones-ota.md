# Actualizaciones por aire (OTA)

Sirven para una cosa concreta: **corregir un fallo el mismo día**. Sin esto, un
error de JavaScript que llegue a Play solo se arregla con una build nueva y su
revisión, que son días. Con la app en 0 usuarios activos semanales, no hay margen
para que un crash viva una semana.

## Qué se puede y qué no

| Cambio | ¿Viaja por OTA? |
|---|---|
| Lógica, pantallas, textos, estilos | **Sí** |
| Dependencias solo de JS | Sí |
| Módulos nativos nuevos (`expo install` de algo con código nativo) | **No** |
| Permisos, iconos, nombre, `app.json` nativo | **No** |
| Subir la `version` de la app | **No** — eso corta el hilo, ver abajo |

Si el cambio toca algo nativo, hace falta build. No hay atajo.

## `runtimeVersion: appVersion`

Una actualización solo llega a las builds cuyo `runtimeVersion` coincide. Con la
política `appVersion`, el runtime **es** la `version` de `app.json`.

Consecuencia práctica: mientras la app publicada sea la `1.1.0`, se le pueden
mandar correcciones. En cuanto se suba a `1.2.0` y se publique esa build, las
`1.1.0` que sigan instaladas dejan de recibir nada. Es lo correcto —una build
nueva puede llevar código nativo incompatible— pero conviene tenerlo presente
antes de subir la versión "por costumbre".

## Publicar una corrección

```bash
eas update --branch production --message "arregla el cobro duplicado"
```

La primera vez hay que enlazar el canal:

```bash
eas update:configure
```

Los usuarios la reciben **al siguiente arranque**, no al instante:
`checkAutomatically: ON_LOAD` comprueba al abrir y `fallbackToCacheTimeout: 0`
hace que no se espere a la descarga. Se eligió así a propósito: bloquear el
arranque unos segundos con una red lenta cuesta más que tener la corrección un
arranque después.

## Antes de usarlo en serio

- **Verificar en un dispositivo de prueba primero.** Una OTA mala llega a todos
  los usuarios sin que Play la revise: es la misma potencia para arreglar que
  para romper.
- **Política de Play.** Se puede corregir y mejorar, no cambiar lo que la app
  hace de forma que evite la revisión. Cambios en anuncios o pagos por OTA son
  justo lo que no conviene.
- Si una actualización deja la app inservible, la salida es publicar otra
  encima. No hay "deshacer" para quien ya la descargó.
