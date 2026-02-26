const fs = require('fs');
const path = require('path');

const DEFAULT_DATA_DIR = path.join(__dirname, '../data');
const VERCEL_DATA_DIR = path.join('/tmp', 'portfolio-data');

function isVercelRuntime() {
  return process.env.VERCEL === '1';
}

function resolveDataDir() {
  const custom = (process.env.DATA_DIR || '').trim();
  if (custom) return path.resolve(custom);
  if (isVercelRuntime()) return VERCEL_DATA_DIR;
  return DEFAULT_DATA_DIR;
}

function ensureDataFile(fileName) {
  const dir = resolveDataDir();
  const sourcePath = path.join(DEFAULT_DATA_DIR, fileName);
  const targetPath = path.join(dir, fileName);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(targetPath)) {
    if (sourcePath !== targetPath && fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
    } else {
      fs.writeFileSync(targetPath, '[]', 'utf8');
    }
  }

  return targetPath;
}

function readJsonArray(fileName) {
  const filePath = ensureDataFile(fileName);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(fileName, data) {
  const filePath = ensureDataFile(fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getDataStoreInfo() {
  const dir = resolveDataDir();
  const mode = isVercelRuntime() ? 'ephemeral-tmp' : 'local-filesystem';
  return { mode, dir };
}

module.exports = {
  readJsonArray,
  writeJsonArray,
  getDataStoreInfo
};
