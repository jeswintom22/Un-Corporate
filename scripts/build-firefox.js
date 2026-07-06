import path from "node:path";
import fs from "node:fs/promises";
import { cleanDir, copyDir } from "./build-common.js";

const root = process.cwd();
const extensionDir = path.join(root, "extension");
const outputDir = path.join(root, "dist", "firefox");
const manifestPath = path.join(extensionDir, "manifests", "manifest.firefox.json");

async function build() {
  await cleanDir(outputDir);
  await copyDir(extensionDir, outputDir);

  await fs.copyFile(manifestPath, path.join(outputDir, "manifest.json"));
  await fs.rm(path.join(outputDir, "manifests"), { recursive: true, force: true });

  console.log("Firefox build complete:", outputDir);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
