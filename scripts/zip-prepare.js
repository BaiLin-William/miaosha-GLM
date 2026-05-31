/**
 * Post-processing script for WXT zip output.
 *
 * 1. Finds the WXT-generated zip in output/
 * 2. Extracts it, renames chrome-mv3/ → 智谱秒杀助手/
 * 3. Re-zips with the correct folder name and final filename
 *
 * Requires: unzip, zip (macOS/Linux)
 * Usage: node scripts/zip-prepare.js
 */

import { readdirSync, readFileSync, existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = 'output';
const BUILD_DIR_NAME = 'chrome-mv3';
const EXT_NAME = '智谱秒杀助手';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const VERSION = pkg.version;
const FINAL_ZIP = `${OUTPUT_DIR}/miaosha-GLM-chrome-mv3-${VERSION}.zip`;
const TMP_DIR = join(OUTPUT_DIR, '__zip_tmp');

function findChromeZip() {
  const files = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('-chrome.zip'));
  if (files.length === 0) {
    console.error('No *-chrome.zip found in output/. Run "wxt zip" first.');
    process.exit(1);
  }
  return join(OUTPUT_DIR, files[0]);
}

function main() {
  const chromeZip = findChromeZip();
  console.log(`Found: ${chromeZip}`);

  // Clean up any previous runs
  rmSync(TMP_DIR, { recursive: true, force: true });
  rmSync(FINAL_ZIP, { force: true });

  // Step 1: Extract to temp directory
  mkdirSync(TMP_DIR, { recursive: true });
  console.log('Extracting...');
  execSync(`unzip -q "${chromeZip}" -d "${TMP_DIR}"`, { stdio: 'inherit' });

  // Step 2: Rename chrome-mv3 → extension display name
  const srcDir = join(TMP_DIR, BUILD_DIR_NAME);
  const dstDir = join(TMP_DIR, EXT_NAME);
  if (!existsSync(srcDir)) {
    console.error(`Expected folder "${BUILD_DIR_NAME}" not found in extracted zip.`);
    rmSync(TMP_DIR, { recursive: true, force: true });
    process.exit(1);
  }
  execSync(`mv "${srcDir}" "${dstDir}"`);
  console.log(`Renamed: ${BUILD_DIR_NAME}/ → ${EXT_NAME}/`);

  // Step 3: Create final zip (from inside tmp so folder name is at root)
  console.log(`Creating ${FINAL_ZIP}...`);
  const absOutput = process.cwd() + '/' + FINAL_ZIP;
  execSync(`cd "${TMP_DIR}" && zip -r -q "${absOutput}" "${EXT_NAME}"`, { stdio: 'inherit' });

  // Step 4: Clean up
  rmSync(TMP_DIR, { recursive: true, force: true });
  rmSync(chromeZip, { force: true });

  console.log(`Done: ${FINAL_ZIP}`);
}

main();
