import { getInitialData, getFinalGatewayUrl } from "./logic.js";
import { resolveMegaEmbed } from "./extractor.js";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return getInitialData(tmdbId, mediaType, seasonNum, episodeNum)
    .then(function (data) {
      return Promise.all((data.languages || ["DUB"]).map(function (lang) {
        return getFinalGatewayUrl(tmdbId, lang, mediaType, seasonNum, episodeNum)
          .then(function (gatewayUrl) {
            if (!gatewayUrl) return [];
            return resolveMegaEmbed(gatewayUrl).then(function (streams) {
              return streams.map(function (stream) {
                var language = lang.toUpperCase() === "LEG" ? "Legendado" : "Dublado";
                return {
                  name: "MegaEmbed " + language + " " + stream.quality + "p",
                  title: stream.title || "Servidor: Byse",
                  url: stream.url,
                  quality: stream.quality,
                  group: language,
                  provider: "megaembed",
                  headers: stream.headers,
                };
              });
            });
          })
          .catch(function () { return []; });
      }));
    })
    .then(function (results) {
      return results.reduce(function (all, current) { return all.concat(current); }, []);
    })
    .catch(function (error) {
      console.log("[MegaEmbed] " + (error && error.message ? error.message : error));
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };
else global.getStreams = getStreams;
