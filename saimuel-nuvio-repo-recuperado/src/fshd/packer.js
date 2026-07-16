export function unpack(packed) {
  try {
    var params = /}\s*\(\s*'([^']*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\s*\.split/.exec(packed);
    if (!params) return null;

    var payload = params[1];
    var radix = parseInt(params[2], 10);
    var count = parseInt(params[3], 10);
    var words = params[4].split("|");

    function encode(value) {
      return (value < radix ? "" : encode(parseInt(value / radix, 10))) +
        ((value = value % radix) > 35 ? String.fromCharCode(value + 29) : value.toString(36));
    }

    var dictionary = {};
    for (var i = 0; i < count; i += 1) {
      dictionary[encode(i)] = words[i] || encode(i);
    }

    return payload.replace(/\b\w+\b/g, function (word) {
      return dictionary[word] || word;
    });
  } catch (error) {
    return null;
  }
}
