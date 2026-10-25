import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendRoot, '..');

const targetDirs = [
  path.join(backendRoot, 'src'),
  path.join(backendRoot, 'tests'),
  path.join(projectRoot, 'docs'),
];

let hasErrors = false;
let totalFiles = 0;

function checkFile(filePath) {
  totalFiles++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // 1. Check for Unicode replacement character (U+FFFD)
    if (line.includes('\uFFFD')) {
      console.error(`[ENCODING ERROR] U+FFFD (replacement character) in ${filePath}:${index + 1}`);
      console.error(`  Line: ${line.trim()}`);
      hasErrors = true;
    }

    // 2. Check for runs of 3+ question marks (?{3,})
    // Ignore lines explicitly tagged with // encoding-ignore or regex literals like /\?{3,}/
    if (/\?{3,}/.test(line)) {
      if (!line.includes('encoding-ignore') && !line.includes('/\\?{3,}/') && !line.includes('check-encoding')) {
        console.error(`[ENCODING ERROR] Corrupted string run of ??? in ${filePath}:${index + 1}`);
        console.error(`  Line: ${line.trim()}`);
        hasErrors = true;
      }
    }
  });
}

function scanDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile()) {
      if (/\.(js|json|md)$/i.test(entry.name)) {
        checkFile(fullPath);
      }
    }
  }
}

console.log('Running encoding check across src/, tests/, and docs/...');
for (const dir of targetDirs) {
  scanDir(dir);
}

if (hasErrors) {
  console.error('\nEncoding check FAILED. Corrupted question-mark strings or U+FFFD found.');
  process.exit(1);
} else {
  console.log(`Encoding check PASSED. Scanned ${totalFiles} files with 0 encoding issues.`);
  process.exit(0);
}
