# Revisión del frontend — 2 de octubre de 2026

Revisión de código del frontend Expo, con atención a agenda, SignalR, formularios
de administración, perfil público y navegación. Las correcciones se concentran
en los fallos de comportamiento encontrados; no es un rediseño visual.

## Fallos corregidos

| Prioridad | Hallazgo | Corrección |
| --- | --- | --- |
| Alta | Cancelar una consulta de disponibilidad se trataba como un fallo de red y podía abrir la pantalla de servidor caído. | El interceptor de Axios propaga las cancelaciones sin consultar health ni cambiar el estado de conexión. |
| Alta | El calendario solicitaba 500 citas, pero la API limita cada página a 100. Se ocultaban las siguientes. | Consulta todas las páginas del período, permite abortar consultas anteriores y descarta una carga parcial si falla una página. |
| Media | Los filtros del listado incluían parte del día siguiente porque la API añade 24 horas a FechaHasta. | Un adaptador convierte los límites exactos de la interfaz al contrato actual de GET /citas. |
| Media | Cambiar día/semana/mes o volver a hoy no recargaba siempre el período. Los filtros y el regreso desde otra pantalla podían volver al mes actual. | La vista solicita su rango al cambiar fecha o modo; los refrescos conservan el rango y los filtros actuales. |
| Media | Avanzar desde el día 31 podía saltar febrero. | La navegación mensual fija primero el día 1 y después cambia de mes. |
| Media | Todas las citas tenían una altura de 45 minutos. Las simultáneas se tapaban entre sí. | Usa la duración guardada por cantidad, reparte solapamientos en columnas y presenta texto compacto para citas cortas. |
| Media | La semana usaba el ancho inicial de la ventana, aunque el contenedor fuera más estrecho o cambiara de tamaño. | Las siete columnas comparten el ancho real mediante flex. |
| Media | Los errores del calendario solo se enviaban a analítica. | Se muestran carga, error y reintento sin desmontar la vista ni perder el período seleccionado. |
| Media | Una fecha imposible como 2030-02-31 pasaba la validación del formulario de horarios. | Usa la validación de fechas reales compartida con el selector de huecos. |
| Media | El evento del calendario del teléfono se creaba con las duraciones del catálogo descargado antes de guardar. | Se construye con la respuesta de la cita confirmada por el servidor. |

La lista y el calendario agrupan por una fecha local explícita, sin depender del
formato que produzca el locale en-CA. El calendario identifica la zona del
dispositivo y sus controles incluyen etiquetas de accesibilidad. SignalR en
CitasScreen se activa mientras la pantalla tiene el foco.

## Compatibilidad y validación

El adaptador de fechas depende del comportamiento actual del backend:
`c.Fecha <= filtros.FechaHasta.Value.AddDays(1)`. Si ese endpoint cambia a extremos
exactos, hay que retirar la compensación de 24 horas de filtrosRangoCitas.
Se resta una cantidad de milisegundos, no un día de calendario local, para conservar
los extremos cuando cambia la hora.

Las consultas paginadas no representan una instantánea transaccional del servidor.
Se eliminan duplicados por id si una cita cambia de página durante la lectura;
SignalR vuelve a consultar al detectar cambios.

- 112 pruebas frontend pasan. Se añadieron pruebas de rangos, navegación mensual,
  paginación, cancelación, duración y distribución de citas simultáneas.
- Las pruebas del componente montan CalendarView y ejecutan sus controles;
  verifican recarga del período, altura real y acceso a reservas simultáneas.
- TypeScript y exportación web pasan.
- ESLint: cero errores y 58 avisos en el conjunto de la aplicación, frente a los
  64 encontrados al comenzar. CalendarView, CitasScreen, el cliente HTTP, la API
  de citas y los nuevos helpers y tests pasan sin avisos; siguen avisos previos
  en otras pantallas y componentes.

No se ha hecho una comprobación visual en navegador contra la API desplegada ni
pruebas en un dispositivo Android. Las migraciones de las entregas anteriores
siguen siendo requisito para validar el recorrido completo en un entorno de pruebas.
La app declara Android y web como plataformas; la exportación avisa de que faltaría
iosAppId de AdMob si se incorporara iOS.
