import * as esbuild from "esbuild";
import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();

const EXTENSION_DIR = path.join(ROOT_DIR, "extension");
const SOURCE_DIR = path.join(EXTENSION_DIR, "src");
const ICONS_DIR = path.join(EXTENSION_DIR, "icons");
const MANIFESTS_DIR = path.join(EXTENSION_DIR, "manifests");

const DIST_DIR = path.join(ROOT_DIR, "dist");
const CHROME_DIST_DIR = path.join(DIST_DIR, "chrome");
const FIREFOX_DIST_DIR = path.join(DIST_DIR, "firefox");

async function cleanDirectory(directory) {
  await rm(directory, {
    recursive: true,
    force: true,
  });

  await mkdir(directory, {
    recursive: true,
  });
}

async function copyExtensionFiles(targetDirectory) {
  await cp(SOURCE_DIR, path.join(targetDirectory, "src"), {
    recursive: true,
  });

  await cp(ICONS_DIR, path.join(targetDirectory, "icons"), {
    recursive: true,
  });
}

async function copyManifest(manifestName, targetDirectory) {
  const manifestPath = path.join(
    MANIFESTS_DIR,
    manifestName
  );

  const manifest = await readFile(manifestPath, "utf8");

  await writeFile(
    path.join(targetDirectory, "manifest.json"),
    manifest,
    "utf8"
  );
}

async function bundleContentScript(targetDirectory) {
  const bundleDirectory = path.join(
    targetDirectory,
    "bundles"
  );

  await mkdir(bundleDirectory, {
    recursive: true,
  });

  await esbuild.build({
    entryPoints: [
      path.join(SOURCE_DIR, "content", "content.js"),
    ],
    bundle: true,
    outfile: path.join(
      bundleDirectory,
      "content.bundle.js"
    ),
    format: "iife",
    platform: "browser",
    target: ["chrome128", "firefox128"],
    sourcemap: true,
    minify: false,
    logLevel: "info",
  });
}

async function buildBrowser({
  name,
  targetDirectory,
  manifestName,
}) {
  console.log(`[BUILD] Building ${name}...`);

  await cleanDirectory(targetDirectory);

  await copyExtensionFiles(targetDirectory);

  await copyManifest(
    manifestName,
    targetDirectory
  );

  await bundleContentScript(targetDirectory);

  console.log(`[BUILD] ${name} build complete.`);
}

async function build() {
  await cleanDirectory(DIST_DIR);

  await buildBrowser({
    name: "Chrome",
    targetDirectory: CHROME_DIST_DIR,
    manifestName: "manifest.chrome.json",
  });

  await buildBrowser({
    name: "Firefox",
    targetDirectory: FIREFOX_DIST_DIR,
    manifestName: "manifest.firefox.json",
  });

  console.log("[BUILD] All extension builds complete.");
}

build().catch((error) => {
  console.error("[BUILD] Failed:", error);
  process.exit(1);
});