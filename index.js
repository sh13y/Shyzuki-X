/**
 * WhatsApp Auto-Reply Bot
 * Built with whatsapp-web.js
 *
 * Features:
 *  - Replies only to allowed phone numbers / WhatsApp LIDs
 *  - Configurable reply message via .env
 *  - Session persistence (no re-scan QR on restart)
 *  - Runs on Windows (dev) and aaPanel / Linux VPS (prod)
 *
 * NOTE on WhatsApp LID:
 *  WhatsApp now uses "Linked Device Identifiers" (LIDs) — large random numbers —
 *  instead of phone numbers for privacy. The bot matches BOTH formats so you
 *  can put either the phone number or the LID in ALLOWED_NUMBERS.
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ─── Configuration ────────────────────────────────────────────────────────────

// Parse allowed numbers/LIDs from env (comma-separated)
const ALLOWED_NUMBERS = (process.env.ALLOWED_NUMBERS || '')
  .split(',')
  .map(n => n.trim())
  .filter(Boolean);

// The reply message
const REPLY_MESSAGE = process.env.REPLY_MESSAGE || 'Hello! This is an automated reply.';

// Detect environment
const IS_LINUX = process.platform === 'linux';

// ─── Validation ───────────────────────────────────────────────────────────────

if (ALLOWED_NUMBERS.length === 0) {
  console.error('[ERROR] No ALLOWED_NUMBERS set in .env file!');
  console.error('        Please copy .env.example to .env and configure it.');
  process.exit(1);
}

console.log('─'.repeat(60));
console.log('  WhatsApp Auto-Reply Bot');
console.log('─'.repeat(60));
console.log(`  Platform        : ${IS_LINUX ? 'Linux (aaPanel/VPS)' : 'Windows (local dev)'}`);
console.log(`  Allowed numbers : ${ALLOWED_NUMBERS.join(', ')}`);
console.log(`  Reply message   : "${REPLY_MESSAGE}"`);
console.log('─'.repeat(60));

// ─── WhatsApp Client Setup ────────────────────────────────────────────────────

// Puppeteer args differ between Linux (VPS/aaPanel) and Windows (local dev)
const puppeteerArgs = IS_LINUX
  ? [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  : [
      // Windows: minimal flags — full sandbox is supported
      '--no-first-run',
      '--disable-extensions'
    ];

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.SESSION_PATH || '.wwebjs_auth'
  }),
  // Pin a known-good WhatsApp Web version — fixes "stuck at 99%" on some systems
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wwebjs/wwebjs-nav/main/'
  },
  puppeteer: {
    headless: true,
    args: puppeteerArgs
  }
});

// ─── Event Handlers ───────────────────────────────────────────────────────────

client.on('qr', (qr) => {
  console.log('\n[INFO] Scan the QR code below with WhatsApp:');
  qrcode.generate(qr, { small: true });
  console.log('[INFO] Go to WhatsApp > Linked Devices > Link a Device\n');
});

let lastPercent = -1;
client.on('loading_screen', (percent, message) => {
  if (percent !== lastPercent) {
    lastPercent = percent;
    console.log(`[LOADING] ${percent}% — ${message}`);
  }
});

client.on('authenticated', () => {
  console.log('[AUTH] Authentication successful! Session saved.');
});

client.on('auth_failure', (msg) => {
  console.error('\n[ERROR] Authentication failed:', msg);
  console.error('[TIP]   Delete .wwebjs_auth folder and restart to re-scan QR.');
  process.exit(1);
});

// Detect if stuck at 99% — give 2 minutes then show hint
let readyTimer = setTimeout(() => {
  console.log('\n[WARN] Still loading... If stuck, try:');
  console.log('       1. Delete .wwebjs_auth folder and restart');
  console.log('       2. Check your internet connection');
}, 120_000);

client.on('ready', () => {
  clearTimeout(readyTimer);
  console.log('\n[READY] ✓ WhatsApp bot is online and listening for messages!\n');
});

// ─── Message Handler ──────────────────────────────────────────────────────────

client.on('message', async (message) => {
  try {
    const chatId  = message.from;   // "XXXXXXXX@c.us" or "XXXXXXXX@g.us"
    const authorId = message.author; // set only for group messages

    // ── Skip groups ──────────────────────────────────────────────────
    if (chatId.endsWith('@g.us')) {
      return;
    }

    // ── Skip own messages ────────────────────────────────────────────
    if (message.fromMe) {
      return;
    }

    // ── Extract the sender's raw ID (before @) ───────────────────────
    // This may be a phone number (e.g. 94776076798)
    // OR a WhatsApp LID (e.g. 164957362593944) — both are handled
    const senderRaw = chatId.split('@')[0];

    const timestamp = new Date().toLocaleString();
    console.log(`[MSG] ${timestamp} | ID: ${senderRaw} | Text: "${message.body}"`);

    // ── Match against allowed list ───────────────────────────────────
    if (ALLOWED_NUMBERS.includes(senderRaw)) {
      console.log(`[REPLY] Sending auto-reply to ${senderRaw}...`);
      await message.reply(REPLY_MESSAGE);
      console.log(`[REPLY] ✓ Sent successfully`);
    } else {
      console.log(`[SKIP] ${senderRaw} is not in ALLOWED_NUMBERS`);
      console.log(`[TIP]  If this is you, add "${senderRaw}" to ALLOWED_NUMBERS in .env`);
    }
  } catch (err) {
    console.error('[ERROR] Failed to handle message:', err.message);
  }
});

client.on('disconnected', (reason) => {
  console.warn('\n[WARN] Disconnected from WhatsApp:', reason);
  console.log('[INFO] Attempting to reconnect in 5 seconds...');
  setTimeout(() => client.initialize(), 5000);
});

// ─── Start Bot ────────────────────────────────────────────────────────────────

console.log('[INIT] Starting WhatsApp client...\n');
client.initialize();

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);
  try {
    await client.destroy();
  } catch (_) { /* ignore */ }
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
