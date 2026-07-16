import { request } from "./http.js";
import { decryptBysePayload } from "./lib/crypto.js";

function getBaseUrl(url) {
  var parts = url.split("/");
  return parts[0] + "//" + parts[2];
}

function getCode(url) {
  var parts = url.split("/e/");
  if (parts.length > 1) return parts[1].split("/")[0];
  var clean = url.split("/").filter(Boolean);
  return clean[clean.length - 1];
}

export function resolveMegaEmbed(gatewayUrl) {
  return new Promise(function (resolve) {
    var currentBase = getBaseUrl(gatewayUrl);
    var refererBase = currentBase.endsWith("/") ? currentBase : currentBase + "/";
    var code = getCode(gatewayUrl);

    request(currentBase + "/api/videos/" + code + "/embed/details", {
      headers: {
        Referer: refererBase,
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })
      .then(function (res) { return res.json(); })
      .then(function (details) {
        var frameUrl = details.embed_frame_url;
        if (!frameUrl) throw new Error("embed_frame_url não encontrado");
        var frameBase = getBaseUrl(frameUrl);
        var frameCode = getCode(frameUrl);
        return request(frameBase + "/api/videos/" + frameCode + "/embed/playback", {
          headers: {
            Accept: "*/*",
            Referer: frameUrl,
            "x-embed-parent": gatewayUrl,
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        return decryptBysePayload(data.playback.payload, data.playback.key_parts, data.playback.iv);
      })
      .then(function (decrypted) {
        if (!decrypted || !decrypted.sources || !decrypted.sources[0]) return resolve([]);
        var masterUrl = decrypted.sources[0].url;

        return request(masterUrl, { headers: { Accept: "text/plain, */*" } })
          .then(function (res) { return res.text(); })
          .then(function (playlist) {
            var lines = playlist.split("\n");
            var streams = [];
            var baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf("/") + 1);

            for (var i = 0; i < lines.length; i += 1) {
              if (lines[i].indexOf("#EXT-X-STREAM-INF") === -1) continue;
              var resolution = lines[i].match(/RESOLUTION=(\d+)x(\d+)/);
              var quality = resolution ? parseInt(resolution[2], 10) : 720;
              var path = lines[i + 1] ? lines[i + 1].trim() : "";
              if (!path) continue;
              streams.push({
                title: "Servidor: Byse (" + quality + "p)",
                url: path.indexOf("http") === 0 ? path : baseUrl + path,
                quality: quality,
                headers: {
                  Referer: currentBase,
                  Origin: currentBase,
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
              });
            }
            resolve(streams);
          })
          .catch(function () {
            resolve([{
              title: "Servidor: Byse",
              url: masterUrl,
              quality: masterUrl.indexOf("_h/") !== -1 ? 1080 : 720,
              headers: {
                Referer: currentBase,
                Origin: currentBase,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            }]);
          });
      })
      .catch(function () { resolve([]); });
  });
}
