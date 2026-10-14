# Configuración de Google: AdMob + Inicio de sesión

Todo el código ya está escrito y compilando. Falta **solo pegar IDs**: esta guía dice
de dónde sacar cada uno y exactamente en qué archivo va.

Hay dos bloques independientes. Puedes hacer uno sin el otro.

> **Cuenta que debes usar:** la misma que tiene la app en Google Play
> (`com.nicolassira.cuadreapp`) y el proyecto Firebase `cuadreapp-782cf`.

---

## Parte 1 — AdMob (anuncios del plan Gratis)

### 1.1 Crear la cuenta y la app

1. Entra a <https://admob.google.com> y crea la cuenta (te pedirá país y zona horaria:
   **no se pueden cambiar después**, y determinan la moneda de los pagos).
2. **Apps → Añadir aplicación → Android → Sí, está en Google Play** → busca
   `com.nicolassira.cuadreapp` y selecciónala.
3. Guarda el **App ID** que te da. Tiene forma `ca-app-pub-0000000000000000~1111111111`
   (con `~`).

### 1.2 Crear los 3 bloques de anuncios

En **Bloques de anuncios → Añadir bloque**, crea uno de cada tipo. Los IDs tienen
forma `ca-app-pub-0000000000000000/2222222222` (con `/`, no `~`).

| Tipo en AdMob | Nombre sugerido | Para qué se usa |
|---|---|---|
| Banner | `cuadre-banner` | Franja inferior en todas las pantallas |
| Intersticial | `cuadre-intersticial` | Al cerrar o cobrar una cita |
| Apertura de app | `cuadre-appopen` | Al volver de segundo plano |

### 1.3 Dónde pegar cada valor

**`app.json`** → reemplaza el App ID de ejemplo (hoy tiene el de pruebas de Google):

```json
[
  "react-native-google-mobile-ads",
  { "androidAppId": "ca-app-pub-TU_ID~TU_ID" }
]
```

**`eas.json`** → en los perfiles `preview` **y** `production`:

```json
"EXPO_PUBLIC_ADMOB_BANNER_ID": "ca-app-pub-.../...",
"EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID": "ca-app-pub-.../...",
"EXPO_PUBLIC_ADMOB_APPOPEN_ID": "ca-app-pub-.../..."
```

> En desarrollo (`__DEV__`) el código **ignora estos valores** y usa siempre los IDs de
> prueba de Google. Es a propósito: pedir anuncios reales desde una build de debug, o
> hacer clic en tus propios anuncios, es la causa más común de baneo de una cuenta AdMob.

### 1.4 `app-ads.txt` (no te lo saltes)

Sin este archivo, muchos compradores no pujan por tu inventario y ganas bastante menos.

1. En Play Console, la ficha de la app debe declarar un **sitio web del desarrollador**
   → pon `https://cuadreapp.duckdns.org`.
2. En AdMob, copia tu **ID de editor** (`pub-0000000000000000`).
3. Edita `BarberShopLanding/app-ads.txt` (ya está creado con un marcador) y reemplaza el ID.
4. Debe quedar accesible en `https://cuadreapp.duckdns.org/app-ads.txt`.
5. En AdMob → **App-ads.txt** verás el estado; tarda hasta 24 h en verificarse.

### 1.5 Declaraciones en Play Console

Obligatorias antes de publicar la versión con anuncios:

- **Contenido de la app → Anuncios** → "Sí, contiene anuncios".
- **Seguridad de los datos** → declara recopilación de **ID de dispositivo** y
  **datos de uso**, para "Publicidad o marketing".
- La política de privacidad ya está actualizada (`BarberShopLanding/privacy-policy.html`,
  sección 10). **Publícala antes** de subir el bundle.

### 1.6 Probar sin arriesgar la cuenta

```bash
eas build --profile preview --platform android
```

Verás anuncios de prueba ("Test Ad"). Para ver anuncios reales sin riesgo, registra el
dispositivo en AdMob → **Configuración → Dispositivos de prueba**.

> AdMob tarda días en aprobar una cuenta nueva y en llenar inventario. Que no aparezcan
> anuncios los primeros días **no es un bug**.

---

## Parte 2 — Inicio de sesión con Google

El flujo ya implementado: entrar con Google → si el correo ya existe se vincula solo,
y si es nuevo se abre "Completa tu negocio" para pedir nombre del negocio y teléfono.

### 2.1 Obtener las huellas SHA-1

Google identifica tu app por **package name + huella del certificado de firma**. Como
firmas con EAS, la huella la tiene EAS, no tu PC:

```bash
eas credentials --platform android
```

Elige el perfil `production` → **Keystore: Manage everything** → verás
`SHA1 Fingerprint`. Cópialo.

Necesitas **dos** huellas si quieres probar con builds internas:

- La de **producción** (la de arriba).
- La del perfil **preview/development**, si usa otro keystore.

Además, si Google Play usa **firma de apps de Play** (lo normal), hace falta una tercera:
Play Console → **Configuración → Integridad de la app → Certificado de firma de apps** →
copia ese SHA-1. **Sin esta, el login falla solo en la versión descargada de Play** —
es el error más común y el más difícil de diagnosticar, porque en tus pruebas funciona.

### 2.2 Registrar las huellas en Firebase

El proyecto `cuadreapp-782cf` ya existe (se creó para las notificaciones push).

1. <https://console.firebase.google.com> → proyecto **cuadreapp-782cf**.
2. **Configuración del proyecto → Tus apps → Android** (`com.nicolassira.cuadreapp`).
3. **Añadir huella digital** → pega cada SHA-1 de 2.1.
4. **Descarga el `google-services.json` actualizado** y reemplaza el que está en la raíz
   de `BarberShopApp/`.

> Cómo saber que quedó bien: el `google-services.json` nuevo debe traer un bloque
> `oauth_client` con entradas. **El actual del repo no tiene ninguna** — por eso hoy
> el login con Google no funcionaría aunque el código esté listo.

### 2.3 Activar Google como proveedor

Firebase → **Authentication → Sign-in method → Google → Habilitar**. Pon un correo de
soporte y guarda. Esto crea automáticamente el **Web client ID** que necesitas.

### 2.4 Pantalla de consentimiento

<https://console.cloud.google.com> → mismo proyecto → **APIs y servicios → Pantalla de
consentimiento de OAuth**:

- Tipo: **Externo**.
- Nombre de la app: `CuadreAPP`. Correo de asistencia y logo.
- Enlace a la política de privacidad: `https://cuadreapp.duckdns.org/privacy-policy.html`
- Permisos: solo `email`, `profile` y `openid`. Son no sensibles, así que **no requieren
  verificación de Google**.
- **Estado de publicación → Publicar aplicación.** Si lo dejas en "Pruebas", solo podrán
  entrar los correos que agregues a mano como usuarios de prueba.

### 2.5 Copiar el Web client ID

**APIs y servicios → Credenciales** → busca *Web client (auto created by Google Service)*
→ copia el **Client ID** (`....apps.googleusercontent.com`).

Va en **dos** lugares:

**`eas.json`** (perfiles `preview` y `production`):

```json
"EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "TU_WEB_CLIENT_ID.apps.googleusercontent.com"
```

**Backend**: ya está puesto en `appsettings.json` (versionado). No es un secreto —el client ID
viaja dentro del token que manda el móvil y es público por diseño—, así que no hace falta
configurarlo aparte en el droplet: `appsettings.Production.json` no sobrescribe esa sección.

```json
"Authentication": {
  "Google": {
    "ClientIds": ["352466600001-ium3v9o1e7lqs8u597ddttp8bljsg3cr.apps.googleusercontent.com"]
  }
}
```

> Sí, en Android también se usa el client ID **Web**, no el de Android. El SDK autentica
> con el client de Android (que se resuelve por package + SHA-1) pero emite el token con
> el Web como audiencia. Si pegas el de Android en el backend, la verificación falla con
> "audiencia inválida" y no vas a entender por qué.

### 2.6 Probar

```bash
eas build --profile preview --platform android
```

El botón "Continuar con Google" **solo aparece si `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
tiene valor**. Si no lo ves, es que la variable llegó vacía a la build.

Casos que conviene probar:

1. Correo nuevo → debe abrir "Completa tu negocio" y crear la empresa en plan Gratis.
2. Correo que ya existe con contraseña → debe entrar directo (vinculación automática).
3. Ese mismo usuario después con su contraseña de siempre → debe seguir funcionando.
4. Cerrar sesión y volver a entrar → debe **volver a preguntar** qué cuenta usar.

---

## Errores frecuentes

| Síntoma | Causa casi siempre |
|---|---|
| `DEVELOPER_ERROR` al tocar el botón | Falta el SHA-1 en Firebase, o el `google-services.json` del repo es el viejo (sin `oauth_client`) |
| Funciona en preview pero falla al bajarla de Play | Falta el SHA-1 de **firma de apps de Play** (paso 2.1) |
| Backend responde "No pudimos validar tu cuenta" | En `ClientIds` pusiste el client de Android en vez del **Web** |
| El botón de Google no aparece | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` vacío en el perfil de EAS usado |
| No se ven anuncios en la build de producción | Cuenta AdMob recién creada (normal, espera unos días) o `Anuncios:Habilitado` en `false` en el droplet |
| Anuncios de prueba en producción | Se compiló con `__DEV__`, o las variables `EXPO_PUBLIC_ADMOB_*` llegaron vacías |

## Interruptor de emergencia

Si los anuncios resultan demasiado molestos, **no hace falta publicar nada**: edita en el
droplet la sección `Anuncios` de `appsettings.Production.json`. Se recarga en caliente.

```json
"Anuncios": { "Habilitado": false }
```

Para apagar solo el más agresivo: `"AppOpenHabilitado": false` (así se entrega por defecto).
