/*
 * Provider desativado de propósito.
 * O repositório público continha somente o bundle ofuscado e não publicou a pasta src correspondente.
 * Substitua este arquivo pela fonte recuperada antes de ativá-lo no manifest.json.
 */
(function (global) {
  "use strict";
  function getStreams() {
    console.log("[Peachify] Fonte original não recuperada; provider mantido desativado.");
    return Promise.resolve([]);
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };
  else global.getStreams = getStreams;
})(typeof globalThis !== "undefined" ? globalThis : this);
