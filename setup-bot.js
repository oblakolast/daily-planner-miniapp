import { loadConfig } from './config.js';
import { tgApi } from './telegram-api.js';

const config = loadConfig();

if (!config.botToken) {
  console.error('❌ В файле НАСТРОЙКИ.txt не заполнен BOT_TOKEN.');
  console.error('   Откройте @BotFather в Telegram, создайте бота и вставьте токен.');
  process.exit(1);
}

if (!/^https:\/\//i.test(config.publicUrl)) {
  console.error('❌ В файле НАСТРОЙКИ.txt не заполнен PUBLIC_URL.');
  console.error('   Нужен публичный HTTPS-адрес приложения, например https://my-app.onrender.com');
  process.exit(1);
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
  console.log('✅ Кнопка меню установлена.');

  await tgApi(config.botToken, 'setMyCommands', {
    commands: [{ command: 'start', description: 'Открыть ежедневник' }],
  });
  console.log('✅ Команда /start настроена.');

  console.log('');
  console.log(`Готово! Откройте бота: https://t.me/${me.username}`);
  console.log('Нажмите «Открыть» или кнопку меню слева от поля ввода.');
} catch (error) {
  console.error('❌ Ошибка Telegram API:', error.message);
  process.exit(1);
}
