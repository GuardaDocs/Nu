/* MegaEmbed — versão legível recuperada do antigo provider Fembed. */
(function (global) {
  "use strict";
  var forge;
  try { forge = require("node-forge"); } catch (_) { forge = global.forge; }

  var DOMAIN = "fembed.sx";
  var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  var COOKIE = "SITE_TOTAL_ID=aNMeQg3ajIMkDqsskT-8twAAAMg";

  function request(url, options) {
    var opts = options || {};
    var headers = Object.assign({ "User-Agent": USER_AGENT, Accept: "*/*", Cookie: COOKIE }, opts.headers || {});
    return fetch(url, Object.assign({}, opts, { headers: headers })).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + ": " + url);
      return res;
    });
  }

  function decodeBase64Url(value) {
    var normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    var padding = (4 - normalized.length % 4) % 4;
    return forge.util.decode64(normalized + "=".repeat(padding));
  }

  function decrypt(payload, keyParts, ivValue) {
    if (!forge) return null;
    try {
      var key = decodeBase64Url(keyParts[0]) + decodeBase64Url(keyParts[1]);
      var iv = decodeBase64Url(ivValue);
      var data = decodeBase64Url(payload);
      var cipherText = data.slice(0, -16);
      var tag = data.slice(-16);
      var decipher = forge.cipher.createDecipher("AES-GCM", key);
      decipher.start({ iv: iv, tagLength: 128, tag: tag });
      decipher.update(forge.util.createBuffer(cipherText));
      if (!decipher.finish()) return null;
      var json = decipher.output.toString("utf8").replace(/^\uFEFF/, "");
      return JSON.parse(json);
    } catch (_) { return null; }
  }

  function baseUrl(url) { var parts = url.split("/"); return parts[0] + "//" + parts[2]; }
  function codeFrom(url) { var parts = url.split("/e/"); return parts.length > 1 ? parts[1].split("/")[0] : url.split("/").filter(Boolean).pop(); }

  function languagesFrom(html) {
    var result = [], regex = /data-lang=["']([^"']+)["']/gi, match;
    while ((match = regex.exec(html)) !== null) if (result.indexOf(match[1]) === -1) result.push(match[1]);
    return result.length ? result : ["DUB"];
  }

  function initialData(tmdbId, mediaType, season, episode) {
    var url = mediaType === "tv" ? "https://" + DOMAIN + "/e/" + tmdbId + "/" + season + "-" + episode : "https://" + DOMAIN + "/e/" + tmdbId;
    return request(url).then(function (res) { return res.text(); }).then(function (html) { return { languages: languagesFrom(html) }; });
  }

  function gateway(tmdbId, lang, mediaType, season, episode) {
    var content = mediaType === "tv" ? season + "-" + episode : "";
    var embedUrl = "https://" + DOMAIN + "/e/" + tmdbId + "/" + content;
    return request("https://" + DOMAIN + "/api.php?s=" + tmdbId + "&c=" + content, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", Referer: embedUrl, Origin: "https://" + DOMAIN },
      body: "action=getPlayer&lang=" + (lang || "DUB") + "&key=MA==",
    }).then(function (res) { return res.text(); }).then(function (html) {
      var iframe = html.match(/src=["']([^"']+)["']/);
      if (!iframe) return null;
      var adsUrl = iframe[1].indexOf("/") === 0 ? "https://" + DOMAIN + iframe[1] : iframe[1];
      return request(adsUrl, { headers: { Referer: embedUrl } }).then(function (res) { return res.text(); }).then(function (ads) {
        var match = ads.match(/src=["'](https:\/\/bysevepoin\.(?:com|in)\/e\/[^"']+)["']/);
        if (!match) return null;
        var parts = match[1].split("/e/");
        return parts[0] + "/e/" + parts[1].split("/")[0];
      });
    }).catch(function () { return null; });
  }

  function resolveGateway(url) {
    var origin = baseUrl(url), code = codeFrom(url);
    return request(origin + "/api/videos/" + code + "/embed/details", { headers: { Referer: origin + "/", "X-Requested-With": "XMLHttpRequest" } })
      .then(function (res) { return res.json(); })
      .then(function (details) {
        var frame = details.embed_frame_url;
        var frameOrigin = baseUrl(frame), frameCode = codeFrom(frame);
        return request(frameOrigin + "/api/videos/" + frameCode + "/embed/playback", {
          headers: { Referer: frame, "x-embed-parent": url, "X-Requested-With": "XMLHttpRequest" },
        });
      }).then(function (res) { return res.json(); }).then(function (data) {
        var decoded = decrypt(data.playback.payload, data.playback.key_parts, data.playback.iv);
        if (!decoded || !decoded.sources || !decoded.sources[0]) return [];
        var master = decoded.sources[0].url;
        return request(master, { headers: { Accept: "text/plain, */*" } }).then(function (res) { return res.text(); }).then(function (playlist) {
          var lines = playlist.split("\n"), streams = [], base = master.substring(0, master.lastIndexOf("/") + 1);
          for (var i = 0; i < lines.length; i += 1) {
            if (lines[i].indexOf("#EXT-X-STREAM-INF") === -1) continue;
            var resolution = lines[i].match(/RESOLUTION=(\d+)x(\d+)/);
            var quality = resolution ? parseInt(resolution[2], 10) : 720;
            var path = lines[i + 1] ? lines[i + 1].trim() : "";
            if (path) streams.push({ url: path.indexOf("http") === 0 ? path : base + path, quality: quality,
              headers: { Referer: origin, Origin: origin, "User-Agent": USER_AGENT } });
          }
          return streams;
        });
      }).catch(function () { return []; });
  }

  function getStreams(tmdbId, mediaType, season, episode) {
    return initialData(tmdbId, mediaType, season, episode).then(function (data) {
      return Promise.all(data.languages.map(function (lang) {
        return gateway(tmdbId, lang, mediaType, season, episode).then(function (url) {
          if (!url) return [];
          return resolveGateway(url).then(function (streams) {
            var language = lang.toUpperCase() === "LEG" ? "Legendado" : "Dublado";
            return streams.map(function (stream) {
              return { name: "MegaEmbed " + language + " " + stream.quality + "p", title: "Servidor: Byse", url: stream.url,
                quality: stream.quality, group: language, provider: "megaembed", headers: stream.headers };
            });
          });
        }).catch(function () { return []; });
      }));
    }).then(function (groups) { return groups.reduce(function (all, group) { return all.concat(group); }, []); })
      .catch(function (error) { console.log("[MegaEmbed]", error && error.message ? error.message : error); return []; });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };
  else global.getStreams = getStreams;
})(typeof globalThis !== "undefined" ? globalThis : this);
