/* FSHD — versão legível recuperada do histórico público. */
(function (global) {
  "use strict";

  var BASE_URL = "https://fshd.link";
  var DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    Origin: BASE_URL,
    Referer: BASE_URL + "/",
  };

  function request(url, options) {
    var opts = options || {};
    var headers = Object.assign({}, DEFAULT_HEADERS, opts.headers || {});
    var method = opts.method || "GET";
    if (method === "POST" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    }
    return fetch(url, { method: method, headers: headers, body: opts.body || null }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + ": " + url);
      return res;
    });
  }

  function unpack(packed) {
    try {
      var params = /}\s*\(\s*'([^']*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\s*\.split/.exec(packed);
      if (!params) return null;
      var payload = params[1], radix = parseInt(params[2], 10), count = parseInt(params[3], 10), words = params[4].split("|");
      function encode(value) {
        return (value < radix ? "" : encode(parseInt(value / radix, 10))) +
          ((value = value % radix) > 35 ? String.fromCharCode(value + 29) : value.toString(36));
      }
      var dictionary = {};
      for (var i = 0; i < count; i += 1) dictionary[encode(i)] = words[i] || encode(i);
      return payload.replace(/\b\w+\b/g, function (word) { return dictionary[word] || word; });
    } catch (_) { return null; }
  }

  function extractInternalPlayer(finalUrl) {
    var headers = {
      Accept: "*/*", "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7", DNT: "1",
      Priority: "u=1, i", Referer: finalUrl, "Sec-CH-UA-Mobile": "?0", "Sec-CH-UA-Platform": '"Linux"',
      "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors", "Sec-Fetch-Site": "same-origin", "Sec-GPC": "1",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    };
    return request(finalUrl, { headers: headers }).then(function (res) { return res.text(); }).then(function (html) {
      var baseMatch = html.match(/var player_base_url\s*=\s*"([^"]+)"/);
      var baseUrl = baseMatch ? baseMatch[1] : "https://112234152.xyz";
      var packedMatch = html.match(/eval\s*\((function\(p,a,c,k,e,d\).+?)\)\s*;?\s*<\/script>/);
      if (!packedMatch) return [];
      var decoded = unpack("eval(" + packedMatch[1] + ")");
      if (!decoded) return [];
      var streamMatch = decoded.match(/["']([^"']+\.txt[^"']*)["']/) || decoded.match(/videoUrl\s*[:=]\s*["'](.*?)["']/);
      if (!streamMatch) return [];
      var path = streamMatch[1].replace(/\\/g, "");
      var url = path.indexOf("http") === 0 ? path : baseUrl.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
      return [{ url: url, quality: 1080, headers: headers }];
    });
  }

  function getStreamsFSHD(tmdbId, season, episode) {
    var pageUrl = BASE_URL + "/serie/" + tmdbId + "/" + season + "/" + episode;
    return request(pageUrl).then(function (res) { return res.text(); }).then(function (html) {
      var active = html.match(/class="episodeOption active" data-contentid="(\d+)"/);
      var fallbackRegex = new RegExp('class="episodeSelector[^"]*"\\s+data-season="' + season + '"[\\s\\S]*?<div[^>]*?data-contentid="(\\d+)"', "i");
      var fallback = html.match(fallbackRegex);
      var contentId = active ? active[1] : (fallback ? fallback[1] : null);
      if (!contentId) throw new Error("Content ID não encontrado");

      var ajaxHeaders = { "X-Requested-With": "XMLHttpRequest", Accept: "application/json", "Content-Type": "application/json", Referer: pageUrl };
      return request(BASE_URL + "/api/options", {
        method: "POST", headers: ajaxHeaders,
        body: JSON.stringify({ content_id: parseInt(contentId, 10), content_type: "2" }),
      }).then(function (res) { return res.text(); }).then(function (text) {
        var ids = [], regex = /["']ID["']\s*:\s*(\d+)/g, match;
        while ((match = regex.exec(text)) !== null) ids.push(match[1]);
        return Promise.all(ids.map(function (videoId) {
          return request(BASE_URL + "/api/players", {
            method: "POST", headers: ajaxHeaders,
            body: JSON.stringify({ content_info: parseInt(contentId, 10), content_type: "2", video_id: parseInt(videoId, 10) }),
          }).then(function (res) { return res.text(); }).then(function (json) {
            var urlMatch = json.match(/["']video_url["']\s*:\s*["'](.*?)["']/);
            var playerUrl = urlMatch ? urlMatch[1].replace(/\\/g, "") : null;
            if (!playerUrl) return null;
            return request(playerUrl, { headers: { Referer: pageUrl } }).then(function (res) { return res.text(); }).then(function (page) {
              var finalMatch = page.match(/window\.location\.href\s*=\s*"([^"]+)"/);
              return finalMatch ? extractInternalPlayer(finalMatch[1]) : null;
            });
          });
        }));
      });
    }).then(function (results) {
      var flat = [];
      results.forEach(function (item) { if (item) flat = flat.concat(item); });
      return flat;
    });
  }

  function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== "tv") return Promise.resolve([]);
    return getStreamsFSHD(tmdbId, seasonNum, episodeNum).then(function (streams) {
      return streams.map(function (stream) {
        return { name: "FSHD Dublado " + (stream.quality || 1080) + "p", title: "Servidor: Fsplay", url: stream.url,
          quality: stream.quality || 1080, group: "Dublado", provider: "fshd", headers: stream.headers };
      });
    }).catch(function (error) { console.log("[FSHD]", error && error.message ? error.message : error); return []; });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };
  else global.getStreams = getStreams;
})(typeof globalThis !== "undefined" ? globalThis : this);
