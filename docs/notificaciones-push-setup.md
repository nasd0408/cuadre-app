# Notificaciones push — setup (FCM + development build)

La app envía un digest diario a las 9:00 am (hora Venezuela) desde el backend:
"Tienes X clientes por cobrar", "X clientes por recordar hoy", "Ayer facturaste…".
Al tocar la notificación abre la pantalla correspondiente.

## ⚠️ Importante
Desde **Expo SDK 53, Expo Go NO recibe push en Android**. Para probar y usar
notificaciones necesitas un **development build** (o el build de producción) y
tener **FCM (Firebase)** configurado. En Expo Go la app no falla: simplemente no
registra token.

## 1. Firebase / FCM (una sola vez)
1. Entra a https://console.firebase.google.com y crea un proyecto (o usa uno).
2. Agrega una app **Android** con el package **`com.nicolassira.cuadreapp`**.
3. Descarga **`google-services.json`** y ponlo en la raíz de `BarberShopApp/`.
4. En `app.json`, dentro de `expo.android`, agrega:
   ```json
   "googleServicesFile": "./google-services.json"
   ```
   (No lo commitees si no quieres; ya está en la lógica de build.)
5. En Firebase → **Configuración del proyecto → Cuentas de servicio →
   Generar nueva clave privada**. Guarda ese JSON (credencial FCM V1).

## 2. Subir la credencial FCM a EAS
```
eas credentials
# Plataforma: Android → Push Notifications: Google Service Account
# → sube el JSON de la cuenta de servicio del paso 1.5 (FCM V1)
```
(También se puede desde el dashboard de Expo: Project → Credentials → Android → FCM V1.)

## 3. Development build
```
eas build --profile development --platform android
```
Instala el APK resultante en tu teléfono (NO uses Expo Go). Luego:
```
npx expo start --dev-client
```

## 4. Probar
1. Inicia sesión → la app pedirá permiso de notificaciones y registrará el token.
2. Registra algunos **deudores** y/o **recordatorios** en la app (si no hay nada
   relevante, el digest no se envía a propósito, para no molestar).
3. Ve a **Más → "Probar notificación"**: dispara el digest a este dispositivo al
   instante (no espera a las 9am).
4. El envío automático ocurre a diario a las **13:00 UTC = 9:00 am Venezuela**.

## 5. Producción
Para el build de Play (`eas build --profile production --platform android`) usa
las mismas credenciales FCM. Solo reconstruye y sube el nuevo bundle.

## Cómo apagar/ajustar
- Hora de envío: `NotificationBackgroundService.HoraEnvioUtc` (backend).
- Contenido/umbral: `NotificationDigestService` (backend).
- El token se borra solo al cerrar sesión (endpoint `DELETE /api/notificaciones/token`).
