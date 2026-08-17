/**
 * WhatsApp Auto-Reply Bot
 * Built with whatsapp-web.js
 * 
 * Features:
 *  - Only replies to specific allowed phone numbers
 *  - Configurable reply message via .env
 *  - Session persistence (no re-scan QR on restart)
 *  - Runs well on aaPanel / Linux VPS with PM2
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ─── Configuration ────────────────────────────────────────────────────────────

// Parse allowed numbers from env (comma-separated)
const ALLOWED_NUMBERS = (process.env.ALLOWED_NUMBERS || '')
  .split(',')
  .map(n => n.trim())
  .filter(Boolean);

// The reply message
const REPLY_MESSAGE = process.env.REPLY_MESSAGE || 'Hello! This is an automated reply.';

// ─── Validation ───────────────────────────────────────────────────────────────

if (ALLOWED_NUMBERS.length === 0) {
  console.error('[ERROR] No ALLOWED_NUMBERS set in .env file!');
  console.error('        Please copy .env.example to .env and configure it.');
  process.exit(1);
}

console.log('─'.repeat(60));
console.log('  WhatsApp Auto-Reply Bot');
console.log('─'.repeat(60));
console.log(`  Allowed numbers : ${ALLOWED_NUMBERS.join(', ')}`);
console.log(`  Reply message   : "${REPLY_MESSAGE}"`);
console.log('─'.repeat(60));

// ─── WhatsApp Client Setup ────────────────────────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth({
    // Session files are stored here — keeps you logged in after restart
    dataPath: process.env.SESSION_PATH || '.wwebjs_auth'
  }),
  puppeteer: {
    // Required for running on headless Linux servers (aaPanel / VPS)
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

// ─── Event Handlers ───────────────────────────────────────────────────────────

// QR Code — scan this with WhatsApp to link your account
client.on('qr', (qr) => {
  console.log('\n[INFO] Scan the QR code below with WhatsApp:');
  qrcode.generate(qr, { small: true });
  console.log('[INFO] Go to WhatsApp > Linked Devices > Link a Device\n');
});

// Loading progress
client.on('loading_screen', (percent, message) => {
  console.log(`[LOADING] ${percent}% — ${message}`);
});

// Authenticated
client.on('authenticated', () => {
  console.log('[AUTH] Authentication successful! Session saved.');
});

// Authentication failure
client.on('auth_failure', (msg) => {
  console.error('[ERROR] Authentication failed:', msg);
  console.error('[INFO]  Delete the .wwebjs_auth folder and restart to re-scan QR.');
});

// Ready to receive messages
client.on('ready', () => {
  console.log('\n[READY] WhatsApp bot is online and listening for messages!\n');
});

// ─── Message Handler ──────────────────────────────────────────────────────────

client.on('message', async (message) => {
  try {
    // message.from format: "60123456789@c.us" (individual)
    // message.from format: "120363XXXXXXXXX@g.us" (group)
    const senderFull = message.from; // e.g. "60123456789@c.us"
    
    // Extract just the number part (before the @)
    const senderNumber = senderFull.split('@')[0];

    // Skip messages from groups (ends with @g.us)
    if (senderFull.endsWith('@g.us')) {
      return;
    }

    // Skip messages sent by this bot itself
    if (message.fromMe) {
      return;
    }

    const timestamp = new Date().toLocaleString();
    console.log(`[MSG] ${timestamp} | From: ${senderNumber} | Text: "${message.body}"`);

    // Check if sender is in the allowed list
    if (ALLOWED_NUMBERS.includes(senderNumber)) {
      console.log(`[REPLY] Sending auto-reply to ${senderNumber}...`);
      await message.reply(REPLY_MESSAGE);
      console.log(`[REPLY] ✓ Sent to ${senderNumber}`);
    } else {
      console.log(`[SKIP] Number ${senderNumber} is not in ALLOWED_NUMBERS — ignoring.`);
    }
  } catch (err) {
    console.error('[ERROR] Failed to handle message:', err);
  }
});

// Disconnected
client.on('disconnected', (reason) => {
  console.warn('[WARN] Client was disconnected:', reason);
  console.log('[INFO] Attempting to reconnect...');
  client.initialize();
});

// ─── Start Bot ────────────────────────────────────────────────────────────────

console.log('[INIT] Starting WhatsApp client...');
client.initialize();

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Gracefully shutting down...');
  await client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Received SIGTERM, shutting down...');
  await client.destroy();
  process.exit(0);
});
