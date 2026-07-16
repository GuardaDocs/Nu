import fs from "node:fs";
import vm from "node:vm";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
if (!Array.isArray(manifest)) throw new Error("manifest.json precisa ser um array.");

for (const item of manifest) {
  if (!item.id || !item.filename) throw new Error("Entrada inválida no manifest: " + JSON.stringify(item));
  if (!fs.existsSync(item.filename)) throw new Error("Arquivo ausente: " + item.filename);
  new vm.Script(fs.readFileSync(item.filename, "utf8"), { filename: item.filename });
}
console.log("OK:", manifest.length, "providers; manifest e sintaxe válidos.");
