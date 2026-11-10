import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, 'НАСТРОЙКИ.txt');

function parseConfigFile() {
  const values = {};
  try {
    const text = fs.readFileSync(CONFIG_FILE, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  } catch {
    /* config file is optional when env variables are used */
  }
  return values;
}

export function loadConfig() {
  const file = parseConfigFile();
  const get = (key, fallback = '') => process.env[key] ?? file[key] ?? fallback;

  const explicitPublicUrl = get('PUBLIC_URL').trim();
  const renderPublicUrl = (process.env.RENDER_EXTERNAL_URL || '').trim();
  const publicUrl = (explicitPublicUrl || renderPublicUrl).replace(/\/+$/, '');

  return {
    botToken: get('BOT_TOKEN').trim(),
    publicUrl,
    botUsername: get('BOT_USERNAME').trim().replace(/^@/, ''),
    port: Number(get('PORT', '3000')) || 3000,
    webhookSecret: get('WEBHOOK_SECRET').trim(),
    autoSetWebhook: get('AUTO_SET_WEBHOOK', 'no').trim().toLowerCase() === 'yes',
  };
}

export const projectRoot = __dirname;
export const publicDir = path.join(__dirname, 'public');
