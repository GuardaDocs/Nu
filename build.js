import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const recovered = ["fshd", "megaembed"];
fs.mkdirSync("providers", { recursive: true });

for (const provider of recovered) {
  await build({
    entryPoints: [path.join("src", provider, "index.js")],
    bundle: true,
    outfile: path.join("providers", provider + ".js"),
    format: "iife",
    platform: "browser",
    target: ["es2017"],
    minify: false,
    legalComments: "inline",
    banner: { js: `/* ${provider}: build legível, sem javascript-obfuscator */` },
  });
  console.log("Gerado:", path.join("providers", provider + ".js"));
}
