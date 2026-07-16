import forge from "node-forge";

function decodeBase64Url(value) {
  var normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  var padding = (4 - (normalized.length % 4)) % 4;
  return forge.util.decode64(normalized + "=".repeat(padding));
}

export function decryptBysePayload(payloadB64, keyPartsB64, ivB64) {
  try {
    var key = decodeBase64Url(keyPartsB64[0]) + decodeBase64Url(keyPartsB64[1]);
    var iv = decodeBase64Url(ivB64);
    var fullData = decodeBase64Url(payloadB64);
    var tagLength = 16;
    var cipherText = fullData.slice(0, -tagLength);
    var tag = fullData.slice(-tagLength);

    var decipher = forge.cipher.createDecipher("AES-GCM", key);
    decipher.start({ iv: iv, tagLength: 128, tag: tag });
    decipher.update(forge.util.createBuffer(cipherText));
    if (!decipher.finish()) return null;

    var json = decipher.output.toString("utf8");
    if (json.indexOf("\uFEFF") === 0) json = json.substring(1);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}
