/*
 * router.js
 * ---------
 * Resuelve dónde está cada cosa.
 *
 * El problema que soluciona: index.html vive en la raíz y las páginas viven en
 * /pages. Desde la raíz el contenido está en "content/…"; desde /pages está en
 * "../content/…". En vez de repartir esa cuenta por todo el código, se calcula
 * una sola vez acá y el resto pide rutas ya armadas.
 *
 * Debe cargarse ANTES que content.js.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  /* En Node (generación de audio) no hay location: se asume la raíz. */
  function ubicacion() {
    return global.location || { pathname: '/', search: '' };
  }

  /** ¿Estamos dentro de /pages? */
  function isSubpage() {
    return /\/pages\//.test(ubicacion().pathname);
  }

  /** Prefijo para llegar a la raíz del proyecto. */
  function base() {
    return isSubpage() ? '../' : '';
  }

  /** Ruta a un archivo cualquiera del proyecto. */
  function path(relativeToRoot) {
    return base() + relativeToRoot;
  }

  /**
   * Edición personalizada. Las preferencias viajan por localStorage (mismo
   * origen), así que no hace falta pasarlas por la URL.
   */
  function editionUrl() {
    return path('pages/edicion.html');
  }

  /** Historia viva de la Ruta 22. Opcionalmente ancla en una sección. */
  function route22Url(sectionId) {
    return path('pages/ruta22.html') + (sectionId ? '#' + sectionId : '');
  }

  /** Vuelta al chat, opcionalmente con una pregunta ya cargada. */
  function chatUrl(question) {
    var url = path('index.html');
    return question ? url + '?q=' + encodeURIComponent(question) : url;
  }

  /** Lee un parámetro de la URL actual. */
  function param(name) {
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(ubicacion().search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
  }

  Canillita.router = {
    isSubpage: isSubpage,
    base: base,
    path: path,
    editionUrl: editionUrl,
    route22Url: route22Url,
    chatUrl: chatUrl,
    param: param
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.router;
  }
})(typeof window !== 'undefined' ? window : globalThis);
