const { withAndroidManifest } = require("@expo/config-plugins");

// Desde Android 11 (API 30) rige la "package visibility": una app solo puede
// resolver o lanzar otra por nombre de paquete si la declara en <queries>.
//
// Sin esto, abrir WhatsApp Business con un intent dirigido a com.whatsapp.w4b
// lanza ActivityNotFoundException AUNQUE esté instalado, y la preferencia
// Business/Personal de la configuración de mensajería no se respeta nunca.
const PAQUETES = ["com.whatsapp", "com.whatsapp.w4b"];

module.exports = function withWhatsAppQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (!Array.isArray(manifest.queries)) {
      manifest.queries = [];
    }
    if (manifest.queries.length === 0) {
      manifest.queries.push({});
    }

    const queries = manifest.queries[0];
    if (!Array.isArray(queries.package)) {
      queries.package = [];
    }

    for (const nombre of PAQUETES) {
      const yaEsta = queries.package.some(
        (p) => p.$ && p.$["android:name"] === nombre,
      );
      if (!yaEsta) {
        queries.package.push({ $: { "android:name": nombre } });
      }
    }

    return cfg;
  });
};
