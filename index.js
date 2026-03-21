const axios = require('axios');
const cheerio = require('cheerio');

const version = process.argv[2];
if (!version) {
  console.error('Version argument is required (SNAPSHOT или 25.12.1)');
  process.exit(1);
}

const isSnapshot = version.toUpperCase() === 'SNAPSHOT';
const baseUrl = isSnapshot
  ? 'https://downloads.openwrt.org/snapshots/targets/'
  : `https://downloads.openwrt.org/releases/${version}/targets/`;

console.error(`[index.js] Base URL: ${baseUrl}`);

// --- Helpers ---
async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, { timeout: 20000 });
    return cheerio.load(data);
  } catch (e) {
    console.error(`[index.js] Failed HTML: ${url}`);
    return null;
  }
}

async function fetchJSON(url) {
  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    return data;
  } catch (e) {
    return null;
  }
}

// --- Get targets ---
async function getTargets() {
  const $ = await fetchHTML(baseUrl);
  if (!$) return [];
  const targets = $('a')
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter(h => h && h.endsWith('/') && h !== '../')
    .map(h => h.slice(0, -1));
  console.error(`[index.js] Found ${targets.length} targets`);
  return targets;
}

// --- Get subtargets ---
async function getSubtargets(target) {
  const $ = await fetchHTML(`${baseUrl}${target}/`);
  if (!$) return [];
  return $('a')
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter(h => h && h.endsWith('/') && h !== '../')
    .map(h => h.slice(0, -1));
}

// --- Get pkgarch (profiles.json → index.json → fallback .apk/.ipk) ---
async function getPkgarch(target, subtarget) {
  const base = `${baseUrl}${target}/${subtarget}/`;

  // 1. profiles.json (самый надёжный в 25.12+)
  const profiles = await fetchJSON(`${base}profiles.json`);
  if (profiles?.arch_packages) {
    const archs = Array.isArray(profiles.arch_packages) ? profiles.arch_packages : [profiles.arch_packages];
    console.error(`[index.js] ${target}/${subtarget} → profiles.json: ${archs}`);
    return archs;
  }

  // 2. index.json
  const index = await fetchJSON(`${base}packages/index.json`);
  if (index?.architecture) {
    console.error(`[index.js] ${target}/${subtarget} → index.json: ${index.architecture}`);
    return [index.architecture];
  }

  // 3. Fallback — парсим .apk и .ipk
  return [await getPkgarchFallback(target, subtarget)];
}

async function getPkgarchFallback(target, subtarget) {
  const $ = await fetchHTML(`${baseUrl}${target}/${subtarget}/packages/`);
  if (!$) return 'unknown';

  let pkgarch = 'unknown';
  $('a').each((_, el) => {
    const name = $(el).attr('href');
    if (!name) return;
    const match = name.match(/_([a-zA-Z0-9_-]+)\.(apk|ipk)$/i);
    if (match && match[1] && !name.startsWith('kernel_') && !name.includes('kmod-')) {
      pkgarch = match[1];
      return false;
    }
  });

  if (pkgarch === 'unknown') {
    $('a').each((_, el) => {
      const name = $(el).attr('href');
      if (!name) return;
      const match = name.match(/_([a-zA-Z0-9_-]+)\.(apk|ipk)$/i);
      if (match && name.startsWith('kernel_')) {
        pkgarch = match[1];
        return false;
      }
    });
  }
  return pkgarch;
}

// --- Main ---
async function main() {
  const targets = await getTargets();
  const matrix = [];
  const seen = new Set();

  for (const target of targets) {
    const subtargets = await getSubtargets(target);
    for (const subtarget of subtargets) {
      const archs = await getPkgarch(target, subtarget);
      for (const pkgarch of archs) {
        if (pkgarch === 'unknown') continue;
        const key = `${target}|${subtarget}|${pkgarch}`;
        if (!seen.has(key)) {
          seen.add(key);
          matrix.push({ target, subtarget, pkgarch });
        }
      }
    }
  }

  console.error(`[index.js] Matrix ready: ${matrix.length} entries`);
  console.log(JSON.stringify({ include: matrix }));
}

main().catch(err => {
  console.error('[index.js] FATAL:', err.message);
  process.exit(1);
});
