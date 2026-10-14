# Analítica y errores (Firebase)

Mide el embudo de registro y de conversión a plan pago, y captura errores para
saber **dónde** se pierden los usuarios.

- **Analytics (GA4)** → eventos y propiedades de usuario
- **Crashlytics** → errores de JS y, a diferencia del proveedor anterior, también
  los crashes **nativos**

## Configuración

**No hay variables de entorno.** Toda la config sale de `google-services.json`, lo
que elimina el modo de fallo del proveedor anterior: una variable vacía apagaba la
analítica en silencio y nadie se enteraba durante meses.

Requisito: Google Analytics debe estar **habilitado en el proyecto Firebase**. Se
comprueba mirando que `google-services.json` traiga `analytics_service`. Si no lo
trae, la app compila y funciona pero no reporta ni un evento.

En desarrollo no se envía nada (`__DEV__`), para no ensuciar los datos con pruebas
locales. Para **verificar la instrumentación** hacen falta las dos cosas:

```
# en .env — quítalo cuando termines de verificar
EXPO_PUBLIC_ANALYTICS_DEBUG=1
```

```bash
adb shell setprop debug.firebase.analytics.app com.nicolassira.cuadreapp
```

La variable activa el envío desde la build de desarrollo; el flag de adb hace que
los eventos aparezcan en **DebugView** en segundos en vez de tardar 24 h.

## Arquitectura

```
index.ts              fachada pública: track / screen / identify / reset / captureError
firebaseClient.ts     SDK nativo, cargado con require diferido
firebaseClient.web.ts no-op (react-native-firebase no soporta web)
```

Todo el código de la app importa **solo** desde `index.ts`, nunca del cliente. Esa
separación permitió migrar de PostHog a Firebase sin tocar los 13 archivos que
llaman a `analytics.track()`.

Los SDK se cargan con `require` dentro de `try/catch`, nunca con `import` estático:
resuelven módulos nativos al importarse y tumbarían la app entera en Expo Go.

## Eventos

| Evento | Dónde |
|--------|-------|
| `app_opened` | al abrir la app |
| `screen_view` | cada pantalla (vía `logEvent` con `screen_name` y `screen_class`) |
| `signup_submitted` | registro de negocio enviado |
| `email_confirmed` | código de email confirmado |
| `login_succeeded` | login exitoso (+ `identify`) |
| `servicio_created` | servicio creado |
| `cita_created` | venta/cita creada |
| `subscription_payment_submitted` | comprobante de pago enviado |
| `ad_impression` · `ad_interstitial_shown` · `ad_app_open_shown` | anuncios del plan Gratis |
| `upgrade_prompt_shown` · `upgrade_cta_clicked` | embudo de mejora de plan |
| `plan_changed` | conversión efectiva a plan pago |
| `app_error` | error capturado (también va a Crashlytics) |

Embudo completo: `app_opened → signup_submitted → login_succeeded →
servicio_created → cita_created → upgrade_prompt_shown → upgrade_cta_clicked →
plan_changed`.

## Límites de GA4 que hay que respetar

Lo que los incumple se descarta **en silencio**, sin error:

- Nombres de evento: máx. 40 caracteres, sin espacios, empezando por letra
- Valores de parámetro: máx. 100 caracteres (el cliente los recorta)
- Propiedades de usuario: máx. 36 caracteres
- Solo se aceptan `string`, `number` y `boolean`; los objetos se serializan
- `screen_view`, `app_open`, `session_start` y otros son **nombres reservados**

## Nada de datos personales

GA4 prohíbe enviar información personal identificable. En `identify` van solo
identificadores y segmentos —`empresaId`, `rol`, `plan`— nunca el nombre del
negocio ni el correo.

## Uso

```ts
import { analytics, AnalyticsEvent } from '../analytics';
analytics.track(AnalyticsEvent.CitaCreated, { tipo: 'pagada' });
```

## Dónde mirar los datos

- **Firebase Console → Analytics → DebugView**: en segundos, solo con el flag de adb
- **Analytics → Eventos / Embudos**: hasta 24 h de retraso en informes estándar
- **Crashlytics**: errores agrupados por stack
- **AdMob**: ingresos de anuncios, si el proyecto está vinculado

Los parámetros personalizados no se pueden consultar en GA4 hasta registrarlos como
**dimensiones personalizadas** (Administrar → Definiciones personalizadas).
