import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loadConfig, publicDir } from './config.js';
import { tgApi } from './telegram-api.js';

const config = loadConfig();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function serveStatic(request, response, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(publicDir, `.${requested}`);

  if (resolved !== publicDir && !resolved.startsWith(`${publicDir}${path.sep}`)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(resolved, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const extension = path.extname(resolved).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(resolved).pipe(response);
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('Body is too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

async function handleTelegramUpdate(update) {
  const message = update?.message;
  if (!message || typeof message.text !== 'string') return;
  if (!message.text.startsWith('/start')) return;
  if (!config.botToken || !config.publicUrl) return;

  try {
    await tgApi(config.botToken, 'sendMessage', {
      chat_id: message.chat.id,
      text: 'Ежедневник всегда под рукой 📅\n\nНажмите кнопку ниже, чтобы открыть расписание.',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Открыть ежедневник',
              web_app: { url: config.publicUrl },
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.warn('Не удалось ответить на /start:', error.message);
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    sendJson(response, 200, { ok: true, service: 'daily-planner-miniapp' });
    return;
  }

  if (url.pathname === '/telegram-webhook') {
    if (request.method !== 'POST') {
      sendJson(response, 405, { ok: false });
      return;
    }
    if (config.webhookSecret) {
      const secret = request.headers['x-telegram-bot-api-secret-token'];
      if (secret !== config.webhookSecret) {
        sendJson(response, 401, { ok: false });
        return;
      }
    }
    try {
      const update = await readBody(request);
      sendJson(response, 200, { ok: true });
      void handleTelegramUpdate(update);
    } catch {
      sendJson(response, 400, { ok: false });
    }
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  serveStatic(request, response, pathname);
});

async function setupTelegram() {
  if (!config.botToken) {
    console.log('ℹ️  BOT_TOKEN не заполнен — приложение работает, но меню бота не настроено.');
    return;
  }

  if (!/^https:\/\//i.test(config.publicUrl)) {
    console.log('ℹ️  PUBLIC_URL не заполнен или не HTTPS — меню бота не настроено.');
    return;
  }

  try {
    const me = await tgApi(config.botToken, 'getMe');
    console.log(`🤖 Бот: @${me.username}`);

    await tgApi(config.botToken, 'setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: 'Открыть ежедневник',
        web_app: { url: config.publicUrl },
      },
    });
    console.log('✅ Кнопка меню «Открыть ежедневник» установлена.');

    await tgApi(config.botToken, 'setMyCommands', {
      commands: [{ command: 'start', description: 'Открыть ежедневник' }],
    });

    if (config.autoSetWebhook) {
      if (!config.webhookSecret) {
        console.log('⚠️  AUTO_SET_WEBHOOK=yes, но WEBHOOK_SECRET пуст — вебхук не установлен.');
      } else {
        await tgApi(config.botToken, 'setWebhook', {
          url: `${config.publicUrl}/telegram-webhook`,
          secret_token: config.webhookSecret,
          allowed_updates: ['message'],
        });
        console.log('✅ Вебхук установлен.');
      }
    }

    console.log(`👉 Открыть бота: https://t.me/${me.username}`);
  } catch (error) {
    console.warn('⚠️  Не удалось настроить Telegram:', error.message);
  }
}

server.listen(config.port, '0.0.0.0', () => {
  console.log('');
  console.log('📅 Ежедневник — Telegram Mini App');
  console.log(`🌐 Локально: http://localhost:${config.port}`);
  if (config.publicUrl) console.log(`🌍 Публично: ${config.publicUrl}`);
  console.log('');
  void setupTelegram();
});
