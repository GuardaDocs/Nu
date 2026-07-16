import { request } from "./http.js";
import { extractInternalPlayer } from "./extractor.js";

var OPTIONS_API = "https://fshd.link/api/options";
var PLAYER_API = "https://fshd.link/api/players";
var AJAX_HEADERS = {
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json",
  "Content-Type": "application/json",
};

export function getStreamsFSHD(tmdbId, season, episode) {
  var pageUrl = "https://fshd.link/serie/" + tmdbId + "/" + season + "/" + episode;

  return request(pageUrl)
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var seasonRegex = new RegExp(
        'class="episodeSelector[^"]*"\\s+data-season="' + season + '"[\\s\\S]*?<div[^>]*?data-contentid="(\\d+)"',
        "i"
      );
      var activeMatch = html.match(/class="episodeOption active" data-contentid="(\d+)"/);
      var contentId = activeMatch ? activeMatch[1] : null;

      if (!contentId) {
        var fallbackMatch = html.match(seasonRegex);
        contentId = fallbackMatch ? fallbackMatch[1] : null;
      }

      if (!contentId) throw new Error("Não foi possível encontrar o data-contentid no HTML.");
      return startApiFlow(contentId, pageUrl);
    });
}

function startApiFlow(contentId, referer) {
  return request(OPTIONS_API, {
    method: "POST",
    headers: Object.assign({}, AJAX_HEADERS, { Referer: referer }),
    body: JSON.stringify({ content_id: parseInt(contentId, 10), content_type: "2" }),
  })
    .then(function (res) { return res.text(); })
    .then(function (text) {
      var serverIds = [];
      var regex = /["']ID["']\s*:\s*(\d+)/g;
      var match;
      while ((match = regex.exec(text)) !== null) serverIds.push(match[1]);
      if (serverIds.length === 0) return [];

      return Promise.all(serverIds.map(function (videoId) {
        return request(PLAYER_API, {
          method: "POST",
          headers: Object.assign({}, AJAX_HEADERS, { Referer: referer }),
          body: JSON.stringify({
            content_info: parseInt(contentId, 10),
            content_type: "2",
            video_id: parseInt(videoId, 10),
          }),
        })
          .then(function (res) { return res.text(); })
          .then(function (playerJson) {
            var urlMatch = playerJson.match(/["']video_url["']\s*:\s*["'](.*?)["']/);
            var playerUrl = urlMatch ? urlMatch[1].replace(/\\/g, "") : null;
            if (!playerUrl) return null;

            return request(playerUrl, { headers: { Referer: referer } })
              .then(function (res) { return res.text(); })
              .then(function (pageHtml) {
                var finalMatch = pageHtml.match(/window\.location\.href\s*=\s*"([^"]+)"/);
                return finalMatch ? extractInternalPlayer(finalMatch[1], playerUrl) : null;
              });
          });
      }));
    })
    .then(function (results) {
      var flattened = [];
      (results || []).forEach(function (result) {
        if (result) flattened = flattened.concat(result);
      });
      return flattened;
    });
}
