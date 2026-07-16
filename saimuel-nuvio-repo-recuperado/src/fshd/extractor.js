import { request } from "./http.js";
import { unpack } from "./packer.js";

export function extractInternalPlayer(finalUrl) {
  var browserHeaders = {
    Accept: "*/*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    DNT: "1",
    Priority: "u=1, i",
    Referer: finalUrl,
    "Sec-CH-UA": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Linux"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Sec-GPC": "1",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  };

  return request(finalUrl, { headers: browserHeaders })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var baseMatch = html.match(/var player_base_url\s*=\s*"([^"]+)"/);
      var baseUrl = baseMatch ? baseMatch[1] : "https://112234152.xyz";
      var packedMatch = html.match(/eval\s*\((function\(p,a,c,k,e,d\).+?)\)\s*;?\s*<\/script>/);
      if (!packedMatch) return [];

      var unpacked = unpack("eval(" + packedMatch[1] + ")");
      if (!unpacked) return [];

      var streamMatch = unpacked.match(/["']([^"']+\.txt[^"']*)["']/) ||
        unpacked.match(/videoUrl\s*[:=]\s*["'](.*?)["']/);
      if (!streamMatch) return [];

      var cleanPath = streamMatch[1].replace(/\\/g, "");
      var masterUrl = cleanPath.indexOf("http") === 0
        ? cleanPath
        : baseUrl.replace(/\/$/, "") + "/" + cleanPath.replace(/^\//, "");

      return [{ url: masterUrl, quality: 1080, type: "hls", headers: browserHeaders }];
    });
}
