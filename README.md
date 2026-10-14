# Cuadre APP

App para barberías y negocios de belleza: agenda, clientes, cobros, nómina de profesionales y reservas en línea. Está publicada en [Google Play](https://play.google.com/store/apps/details?id=com.nicolassira.cuadreapp) y tiene versión web.

Backend: [cuadre-api](https://github.com/nasd0408/cuadre-api)

## Stack

- **Expo SDK 54** / **React Native 0.81** (New Architecture), con Android y web desde el mismo código
- **TypeScript**, **Zustand** para el estado y **react-native-paper** para la UI
- **axios** con refresh de JWT y **SignalR** para la agenda en tiempo real
- **Firebase** Analytics y Crashlytics, **AdMob**, inicio de sesión con Google y notificaciones push de Expo
- **EAS Build** y **EAS Update** para builds y actualizaciones OTA
- **Jest** para los tests y **GitHub Actions** para el CI

## Funcionalidades

- **Dos roles:** el dueño (Admin) gestiona todo el negocio y el profesional (Barbero) trabaja con la agenda y los clientes, sin acceso a la administración.
- **Agenda** con calendario, horarios semanales por profesional, ausencias y cambios en tiempo real entre dispositivos.
- **Modo offline:** las citas creadas sin conexión van a una cola persistente y se sincronizan en lote al recuperar la red.
- **Clientes**, importación desde los contactos del teléfono, recordatorios y mensajes por WhatsApp.
- **Cobros, deudores, nómina** e historial de ingresos.
- **Reservas públicas:** cada negocio publica un enlace donde sus clientes reservan sin crear cuenta.
- **Plan gratis con anuncios** y planes de pago, con pantallas de restricción según el estado de la suscripción.

## Estructura

```
src/
  api/            Un módulo por recurso de la API y el cliente axios con refresh de tokens
  screens/        admin/, auth/, public/ (reservas sin cuenta), restriction/ y shared/
  stores/         Stores de Zustand (auth, cola offline, plan, suscripción…)
  Services/       Sincronización de la cola offline
  hooks/          Por ejemplo, useAgendaRealtime (SignalR)
  ads/ analytics/ notifications/ auth/   Integraciones nativas, cada una con su versión .web.ts
  __tests__/      Tests de Jest
docs/             Guías de configuración (Google, push, OTA, reservas públicas)
```

**Una nota sobre web:** los SDK nativos (AdMob, Firebase, Google Sign-In, contactos, calendario) se cargan con `require` diferido o con archivos `.web.ts`, para que nunca entren en el bundle web ni rompan Expo Go. El CI construye el bundle web y falla si encuentra alguno.

## Correr en local

Requisitos: Node 22 y la [API](https://github.com/nasd0408/cuadre-api) corriendo.

1. Instala dependencias y crea tu `.env`:
   ```bash
   npm install
   cp .env.example .env
   ```
   En `.env`, `EXPO_PUBLIC_API_URL` tiene que apuntar a tu API. Con un teléfono físico usa la IP LAN de tu PC, no `localhost`.
2. Arranca:
   ```bash
   npm start        # Expo (Android con dev client o Expo Go)
   npm run web      # versión web
   ```

Algunas funciones nativas, como los anuncios y Firebase, solo funcionan en una build con dev client (`eas build --profile development`). En Expo Go se desactivan sin romper la app.

## Calidad

```bash
npx tsc --noEmit   # tipos
npm run lint       # ESLint
npm test           # Jest
```

El CI ejecuta todo eso en cada push a `main` y en cada pull request. Además construye el bundle web, comprueba que no contenga módulos nativos y audita las dependencias de producción.

## Builds y publicación

Las builds de Android se hacen con EAS (`eas.json`). `npm run release:android` revisa el proyecto y lanza la build de producción, que después se sube a Google Play. Los cambios solo de JavaScript se publican como actualización OTA con EAS Update. Ver [docs/actualizaciones-ota.md](docs/actualizaciones-ota.md).
