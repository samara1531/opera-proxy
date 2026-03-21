const axios = require('axios');
const cheerio = require('cheerio');

const version = process.argv[2];
if (!version) {
  console.error('Version required');
  process.exit(1);
}

const baseUrl = `https://downloads.openwrt.org/releases/${version}/targets/`;

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
    if (json?.architecture) return json.architecture;
  } catch {}
  return null;
}

async function main() {
  const targets = await getTargets();
  const archMap = new Map();

  for (const target of targets) {
    const subs = await getSubtargets(target);

    for (const sub of subs) {
      const arch = await getPkgarch(target, sub);
      if (!arch) continue;

      // сохраняем только первый попавшийся target для arch
      if (!archMap.has(arch)) {
        archMap.set(arch, { target, subtarget: sub, pkgarch: arch });
      }
    }
  }

  const matrix = Array.from(archMap.values());

  console.log(JSON.stringify({ include: matrix }));
}

main();
