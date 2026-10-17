require('dotenv').config();
const path = require('path');

const root = path.join(__dirname);
const envPath = path.join(root, '..', '.env');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));

module.exports = {
    botName: "𝐅ᴀʟʟᴇɴ ✘ 𝐀ɴɢᴇʟs",
    port: Number(process.env.PORT) || 3000,
    whatsappConnectTimeoutMs: Number(process.env.WHATSAPP_CONNECT_TIMEOUT_MS) || 60000,
    whatsappNewsletterJid: '120363432013190547@newsletter',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    defaultPrefix: process.env.DEFAULT_PREFIX || '.',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    claudeApiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
    claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
    removeBgApiKey: process.env.REMOVE_BG_API_KEY || '',
    envPath,
    dataDir,
    sessionsDir: path.resolve(process.env.SESSIONS_DIR || path.join(dataDir, 'sessions')),
    dbPath: path.resolve(process.env.DATABASE_PATH || path.join(dataDir, 'bot.db')),
    assetsDir: path.join(root, '..', 'public', 'assets'),
    // developerContact: 'https://wa.me/50947368210'
}
