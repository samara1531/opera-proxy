const axios = require('axios');
const cheerio = require('cheerio');

const version = process.argv[2];
if (!version) {
  console.error('Version argument is required (example: SNAPSHOT or 24.10.0)');
  process.exit(1);
}

const isSnapshot = version.toUpperCase() === 'SNAPSHOT';
const baseUrl = isSnapshot
  ? 'https://downloads.openwrt.org/snapshots/targets/'
  : `https://downloads.openwrt.org/releases/${version}/targets/`;

console.error(`Using base URL: ${baseUrl}`);

// --- HTTP helpers ---
async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    return cheerio.load(data);
  } catch (err) {
    console.error(`Failed to fetch HTML: ${url} → ${err.message}`);
    return null;
  }
}

async function fetchJSON(url) {
  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    return data;
  } catch (err) {
    console.error(`Failed to fetch JSON: ${url} → ${err.message}`);
    return null;
  }
}

// --- Get target folders ---
async function getTargets() {
  const $ = await fetchHTML(baseUrl);
  if (!$) return [];

  const targets = $('a')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(href => href && href.endsWith('/') && href !== '../')
    .map(href => href.slice(0, -1));

  console.error(`Found ${targets.length} targets`);
  if (targets.length > 0) console.error(`First few: ${targets.slice(0,5).join(', ')}...`);
  return targets;
}

// --- Get subtarget folders ---
async function getSubtargets(target) {
  const url = `${baseUrl}${target}/`;
  const $ = await fetchHTML(url);
  if (!$) return [];

  const subs = $('a')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(href => href && href.endsWith('/') && href !== '../')
    .map(href => href.slice(0, -1));

  console.error(`  ${target} → ${subs.length} subtargets`);
  return subs;
}

// --- Get pkgarch ---
async function getPkgarch(target, subtarget) {
  const baseTargetUrl = `${baseUrl}${target}/${subtarget}/`;

  // 1. index.json (иногда есть architecture)
  const indexUrl = `${baseTargetUrl}packages/index.json`;
  let json = await fetchJSON(indexUrl);
  if (json && typeof json.architecture === 'string' && json.architecture !== '') {
    console.error(`    ${target}/${subtarget} → architecture from index.json: ${json.architecture}`);
    return [json.architecture];
  }

  // 2. profiles.json (самый надёжный источник в новых версиях)
  const profilesUrl = `${baseTargetUrl}profiles.json`;
  json = await fetchJSON(profilesUrl);
  if (json && json.arch_packages) {
    const archs = Array.isArray(json.arch_packages) ? json.arch_packages : [json.arch_packages];
    if (archs.length > 0 && archs[0] !== '') {
      console.error(`    ${target}/${subtarget} → arch_packages from profiles.json: ${archs.join(', ')}`);
      return archs;
    }
  }

  // 3. Fallback — парсим пакеты из packages/
  return [await getPkgarchFallback(target, subtarget)];
}

// --- Fallback: ищем .apk и .ipk ---
async function getPkgarchFallback(target, subtarget) {
  const packagesUrl = `${baseUrl}${target}/${subtarget}/packages/`;
  let pkgarch = 'unknown';

  const $ = await fetchHTML(packagesUrl);
  if (!$) return pkgarch;

  // Ищем обычный пакет (не kernel, не kmod)
  $('a').each((i, el) => {
    const name = $(el).attr('href');
    if (!name) return;

    const match = name.match(/_([a-zA-Z0-9_-]+)\.(apk|ipk)$/i);
    if (match && match[1] && !name.startsWith('kernel_') && !name.includes('kmod-')) {
      pkgarch = match[1];
      console.error(`    Fallback found pkgarch from package: ${pkgarch} (${name})`);
      return false; // break
    }
  });

  // Если ничего — берём из kernel_*.apk / .ipk
  if (pkgarch === 'unknown') {
    $('a').each((i, el) => {
      const name = $(el).attr('href');
      if (!name) return;

      const match = name.match(/_([a-zA-Z0-9_-]+)\.(apk|ipk)$/i);
      if (match && match[1] && name.startsWith('kernel_')) {
        pkgarch = match[1];
        console.error(`    Kernel fallback pkgarch: ${pkgarch} (${name})`);
        return false;
      }
    });
  }

  if (pkgarch === 'unknown') {
    console.error(`    No usable package found for fallback in ${packagesUrl}`);
  }

  return pkgarch;
}

// --- Main ---
async function main() {
  try {
    const targets = await getTargets();
    if (targets.length === 0) {
      console.error('No targets found — check URL or network');
      process.exit(1);
    }

    const matrix = [];
    const seen = new Set();

    for (const target of targets) {
      const subtargets = await getSubtargets(target);
      for (const subtarget of subtargets) {
        const archs = await getPkgarch(target, subtarget);
        for (const pkgarch of archs) {
          if (pkgarch === 'unknown' || !pkgarch) continue;

          const key = `${target}|${subtarget}|${pkgarch}`;
          if (!seen.has(key)) {
            seen.add(key);
            matrix.push({ target, subtarget, pkgarch });
          }
        }
      }
    }

    console.error(`Total unique entries in matrix: ${matrix.length}`);
    console.log(JSON.stringify({ include: matrix }));
  } catch (err) {
    console.error('Fatal error in main:', err.message || err);
    process.exit(1);
  }
}

main();
