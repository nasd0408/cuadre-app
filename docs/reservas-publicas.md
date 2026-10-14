# Web de reservas sin cuenta

La reserva pública vive dentro de la exportación web actual, en `/app/` del mismo DuckDNS que la API. No requiere otra aplicación ni un proveedor de alojamiento adicional.

- `/app/#/reservar/{token}` abre la agenda del negocio.
- Añadir `/{empleadoId}` preselecciona ese profesional.
- `/app/#/cita/{token}` abre el comprobante privado y la cancelación.

En Administración → Perfil público → Reservas sin cuenta, guardar el perfil publicado, seleccionar un local publicado y activar la opción. Se muestran enlaces del negocio y de sus profesionales con horario activo, con botones para abrir y copiar/compartir. La ficha pública también muestra «Reservar cita» cuando la opción está activa.

El formulario muestra los horarios en la zona del profesional, aunque el visitante esté en otro país. Admite nombre, teléfono y correo opcional. Usa un cliente Axios independiente de JWT, refresh e interceptores privados. Las páginas públicas se muestran incluso si el administrador tenía activado el modo offline o la sesión privada tiene un error de conexión. Su propia carga muestra los errores y permite reintentar.

Al reservar se genera un token privado mediante `crypto.getRandomValues`. El mismo formulario lo conserva al reintentar, bloquea el doble toque y ofrece «Comprobar mi última reserva» si se pierde la respuesta. Solo el token se guarda en `sessionStorage`, sin almacenar el contacto. Cambiar los datos genera una nueva solicitud. Un 409 recarga los horarios y conserva los campos de contacto; exige seleccionar otro horario.

El comprobante permite copiar su enlace y confirmar una cancelación. El backend valida de nuevo el estado de la cita. La confirmación está en esta página; esta entrega no envía correo, WhatsApp ni SMS.

## Construcción para DuckDNS

Usar estas variables en el proceso de construcción, sin editar el `.env` local de desarrollo:

```powershell
$env:EXPO_PUBLIC_API_URL = 'https://cuadreapp.duckdns.org/api'
$env:EXPO_PUBLIC_WEB_URL = 'https://cuadreapp.duckdns.org/app/'
npm run build:web
```

`build:web` exporta y ejecuta `fix-paths.js`, que ajusta assets y HTML para `/app/`. Publicar el contenido de `dist` con el procedimiento existente, después de aplicar la migración del backend. No activar reservas hasta tener publicados ambos componentes.

## Pruebas

124 pruebas de frontend, tipos y exportación web pasan. El linter no añade avisos en los archivos nuevos. Hay pruebas del cliente anónimo, zonas horarias, enlaces, doble toque, recuperación tras conexión interrumpida, horario ocupado, cancelación y apertura de las rutas públicas con modo offline previo.

También se revisó el flujo en el navegador integrado con un negocio ficticio servido localmente: formulario, confirmación privada, diálogo de cancelación y estado cancelado. Esa vista utilizó respuestas de prueba; las reglas reales se verificaron en las pruebas de backend con HTTP/WebSockets y PostgreSQL.
