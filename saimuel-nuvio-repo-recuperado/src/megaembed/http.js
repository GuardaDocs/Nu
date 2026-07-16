const SESSION_COOKIE = "SITE_TOTAL_ID=aVK_vxjRNajd7sVPpHujcAAAAMw";

export const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  Cookie: SESSION_COOKIE,
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

export function request(url, options) {
  var opts = options || {};
  var headers = Object.assign({}, BASE_HEADERS, opts.headers || {});
  var timeout = opts.timeout || 15000;

  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error("Timeout: " + url)); }, timeout);
    fetch(url, Object.assign({}, opts, { headers: headers }))
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) reject(new Error("HTTP " + res.status + ": " + url));
        else resolve(res);
      })
      .catch(function (error) {
        clearTimeout(timer);
        reject(error);
      });
  });
}
