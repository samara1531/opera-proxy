const axios = require('axios');
const cheerio = require('cheerio');

const version = process.argv[2];
if (!version) {
  console.error('Version required');
  process.exit(1);
}

const isSnapshot = version === 'SNAPSHOT';

const baseUrl = isSnapshot
  ? `https://downloads.openwrt.org/snapshots/targets/`
  : `https://downloads.openwrt.org/releases/${version}/targets/`;

async function fetchHTML(url) {
  const { data } = await axios.get(url);
  return cheerio.load(data);
}

async function fetchJSON(url) {
  const { data } = await axios.get(url);
  return data;
}

async function getTargets() {
  const $ = await fetchHTML(baseUrl);
  return $('a')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(h => h && h.endsWith('/'))
    .map(h => h.slice(0, -1));
}

async function getSubtargets(target) {
  const $ = await fetchHTML(`${baseUrl}${target}/`);
  return $('a')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(h => h && h.endsWith('/'))
    .map(h => h.slice(0, -1));
}

async function getPkgarch(target, subtarget) {
  try {
    const json = await fetchJSON(`${baseUrl}${target}/${subtarget}/packages/index.json`);
    if (json && json.architecture) return json.architecture;
  } catch {}
  return null;
}

(async () => {
  try {
    const targets = await getTargets();
    const map = new Map();

    for (const target of targets) {
      const subs = await getSubtargets(target);

      for (const sub of subs) {
        const arch = await getPkgarch(target, sub);
        if (!arch) continue;

        // берём первый target для каждой архитектуры
        if (!map.has(arch)) {
          map.set(arch, {
            target,
            subtarget: sub,
            pkgarch: arch
          });
        }
      }
    }

    console.log(JSON.stringify({ include: Array.from(map.values()) }));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
