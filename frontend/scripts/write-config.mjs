import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiUrl = (process.env.API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const out = join(__dirname, '..', 'public', 'config.json');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ apiUrl }, null, 2) + '\n');
console.log(`Wrote ${out} with apiUrl=${apiUrl}`);
