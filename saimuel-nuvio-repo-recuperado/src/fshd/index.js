import { getStreamsFSHD } from "./logic.js";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  if (mediaType !== "tv") return Promise.resolve([]);

  return getStreamsFSHD(tmdbId, seasonNum, episodeNum)
    .then(function (streams) {
      return streams.map(function (stream) {
        var quality = stream.quality || 1080;
        var language = stream.lang || "Dublado";
        return {
          name: "FSHD " + language + " " + quality + "p",
          title: "Servidor: Fsplay",
          url: stream.url,
          quality: quality,
          group: language,
          provider: "fshd",
          headers: stream.headers,
        };
      });
    })
    .then(function (results) {
      return results.sort(function (a, b) { return b.quality - a.quality; });
    })
    .catch(function (error) {
      console.log("[FSHD] " + (error && error.message ? error.message : error));
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };
else global.getStreams = getStreams;
