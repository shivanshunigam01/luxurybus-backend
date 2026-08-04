import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../src/config/env.js';

dotenv.config();

const outDir = path.resolve(process.cwd(), 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(outDir, { recursive: true });

const uri = env.MONGODB_URI;
const args = [`--uri=${uri}`, `--out=${outDir}`];
const child = spawn('mongodump', args, { stdio: 'inherit', shell: true });

child.on('exit', (code) => {
  if (code === 0) {
    console.log('Backup complete:', outDir);
    process.exit(0);
  }
  console.error('mongodump failed. Ensure MongoDB Database Tools are installed and on PATH.');
  process.exit(code || 1);
});
