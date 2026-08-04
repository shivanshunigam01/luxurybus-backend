import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../../gobus-rentals/src/data/indian-cities.ts');
const t = fs.readFileSync(src, 'utf8');
const start = t.indexOf('const STATE_CITIES');
const end = t.indexOf('function buildCities');
const block = t.slice(start, end);
const cities = [];
const re = /:\s*\[([\s\S]*?)\]/g;
let m;
while ((m = re.exec(block))) {
  const names = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  cities.push(...names);
}
const uniq = [...new Set(cities)];
const out = uniq.map((name) => ({ name, state: 'India' }));
fs.mkdirSync(path.resolve(__dirname, 'data'), { recursive: true });
fs.writeFileSync(path.resolve(__dirname, 'data/indiaCitiesFromFrontend.json'), JSON.stringify(uniq, null, 2));
console.log('wrote', uniq.length);
