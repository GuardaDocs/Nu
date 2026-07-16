import { request } from "./http.js";

var DOMAIN = "fembed.sx";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
var API_COOKIE = "SITE_TOTAL_ID=aNMeQg3ajIMkDqsskT-8twAAAMg";

function extractLanguages(html) {
  var languages = [];
  var menuMatch = html.match(/id=["']audioMenu["'][\s\S]*?<\/[^>]+>/i);
  var source = menuMatch ? menuMatch[0] : html;
  var regex = /data-lang=["']([^"']+)["']/gi;
  var match;
  while ((match = regex.exec(source)) !== null) {
    if (languages.indexOf(match[1]) === -1) languages.push(match[1]);
  }
  return languages.length ? languages : ["DUB"];
}

export function getInitialData(tmdbId, mediaType, seasonNum, episodeNum) {
  var path = mediaType === "tv"
    ? "https://" + DOMAIN + "/e/" + tmdbId + "/" + seasonNum + "-" + episodeNum
    : "https://" + DOMAIN + "/e/" + tmdbId;

  return request(path, { headers: { "User-Agent": USER_AGENT, Cookie: API_COOKIE } })
    .then(function (res) { return res.text(); })
    .then(function (html) { return { targetUrl: path, languages: extractLanguages(html) }; });
}

export function getFinalGatewayUrl(tmdbId, lang, mediaType, seasonNum, episodeNum) {
  var contentParam = mediaType === "tv" ? seasonNum + "-" + episodeNum : "";
  var apiUrl = "https://" + DOMAIN + "/api.php?s=" + tmdbId + "&c=" + contentParam;
  var embedUrl = "https://" + DOMAIN + "/e/" + tmdbId + "/" + contentParam;

  return request(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "*/*",
      Referer: embedUrl,
      Origin: "https://" + DOMAIN,
      "User-Agent": USER_AGENT,
      Cookie: API_COOKIE,
    },
    body: "action=getPlayer&lang=" + (lang || "DUB") + "&key=MA==",
  })
    .then(function (res) { return res.text(); })
    .then(function (playerResponse) {
      var iframeMatch = playerResponse.match(/src=["']([^"']+)["']/);
      if (!iframeMatch) return null;
      var adsUrl = iframeMatch[1];
      if (adsUrl.indexOf("/") === 0) adsUrl = "https://" + DOMAIN + adsUrl;

      return request(adsUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          Referer: embedUrl,
          "User-Agent": USER_AGENT,
          Cookie: API_COOKIE,
          "Upgrade-Insecure-Requests": "1",
        },
      })
        .then(function (res) { return res.text(); })
        .then(function (adsResponse) {
          var gatewayMatch = adsResponse.match(/src=["'](https:\/\/bysevepoin\.(?:com|in)\/e\/[^"']+)["']/);
          if (!gatewayMatch) return null;
          var rawUrl = gatewayMatch[1];
          var parts = rawUrl.split("/e/");
          if (parts.length < 2) return rawUrl;
          return parts[0] + "/e/" + parts[1].split("/")[0];
        });
    })
    .catch(function () { return null; });
}
