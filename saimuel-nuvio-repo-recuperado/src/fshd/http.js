const BASE_URL = "https://fshd.link";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/json, text/javascript, */*; q=0.01",
  "X-Requested-With": "XMLHttpRequest",
  Origin: BASE_URL,
  Referer: BASE_URL + "/",
};

export function request(url, options) {
  var opts = options || {};
  var headers = Object.assign({}, HEADERS, opts.headers || {});
  var method = opts.method || "GET";
  var body = opts.body || null;

  if (method === "POST" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
  }

  return fetch(url, { method: method, headers: headers, body: body }).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status + ": " + url);
    return res;
  });
}
