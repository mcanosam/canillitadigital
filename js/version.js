/*
 * version.js
 * ----------
 * La versión del proyecto, en un solo lugar.
 *
 * La leen la interfaz (para mostrarla al pie), el generador del boletín (que
 * la deja escrita en los metadatos del audio) y cualquier herramienta de Node.
 * Si hay que cambiarla, se cambia acá y en CHANGELOG.md. En ningún otro lado.
 *
 * Criterio de numeración:
 *   - tercer número: correcciones y ajustes menores
 *   - segundo número: funcionalidad nueva o cambios visibles
 *   - primer número: cambio de fondo en el producto
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  Canillita.version = '1.10.0';

  /** Versión corta para mostrar en pantalla: 1.6.0 -> v1.6 */
  Canillita.versionLabel = function () {
    var partes = Canillita.version.split('.');
    return 'v' + partes[0] + '.' + partes[1];
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      version: Canillita.version,
      versionLabel: Canillita.versionLabel
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
