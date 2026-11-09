import { build } from "esbuild";
import fs from "fs";
const pkg = JSON.parse(fs.readFileSync("node_modules/@anthropic-ai/sdk/package.json", "utf8"));
await build({ entryPoints: ["entry.js"], bundle: true, minify: true, format: "iife", platform: "browser", target: "es2020",
  outfile: "../../app/vendor/anthropic-sdk.js", banner: { js: `/* @anthropic-ai/sdk ${pkg.version} (MIT), bundled for the browser: window.Anthropic */` } });
fs.copyFileSync("node_modules/@anthropic-ai/sdk/LICENSE", "../../app/vendor/LICENSE-anthropic-sdk.txt");
console.log("app/vendor/anthropic-sdk.js written (@anthropic-ai/sdk " + pkg.version + ")");
