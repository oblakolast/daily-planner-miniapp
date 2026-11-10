# Ежедневник — Telegram Mini App

Веб-версия мобильного приложения `DailyPlanner` для Telegram: расписание пар,
свайпы по дням и неделям, настройки, готовое расписание ТГЭ-26-2, статистика,
управление днями, незапланированные события, календарь и игра с котиком.

## Быстрый старт

1. Заполни в `НАСТРОЙКИ.txt` токен бота из `@BotFather`.
2. Запусти локально и проверь приложение:

```powershell
node server.js
```

Открой http://localhost:3000

3. Опубликуй папку `public` на HTTPS (Netlify Drop, Render или Cloudflare Tunnel)
   и впиши полученный адрес в `PUBLIC_URL` в `НАСТРОЙКИ.txt`.
4. Настрой кнопку меню бота:

```powershell
node setup-bot.js
```

5. Открой бота в Telegram и нажми кнопку «Открыть ежедневник».

Подробная инструкция по BotFather, Cloudflare Tunnel, Netlify и Render:
[`ИНСТРУКЦИЯ.md`](./ИНСТРУКЦИЯ.md).

## Состав

- `public/` — приложение (HTML, CSS, ES-модули, картинки).
- `server.js` — локальный статический сервер и вебхук бота.
- `setup-bot.js` — установка кнопки меню и команды `/start`.
- `config.js` — чтение настроек из `НАСТРОЙКИ.txt` или переменных окружения.
- `telegram-api.js` — вызовы Telegram Bot API.
- `render.yaml` — готовый Blueprint для бесплатного деплоя на Render.

Данные хранятся в Telegram CloudStorage. Сервер не хранит расписание.
