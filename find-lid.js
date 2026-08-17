/**
 * find-lid.js — Find someone's WhatsApp LID by their phone number
 *
 * Usage:
 *   node find-lid.js 94712345678
 *   node find-lid.js 94712345678 60123456789 919876543210
 *
 * The numbers are looked up against your linked WhatsApp account.
 * Make sure you've already authenticated (run node index.js once and scanned QR).
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node find-lid.js <number1> [number2] ...');
  console.log('Example: node find-lid.js 94776076798');
  process.exit(0);
}

const IS_LINUX = process.platform === 'linux';

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.SESSION_PATH || '.wwebjs_auth'
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wwebjs/wwebjs-nav/main/'
  },
  puppeteer: {
    headless: true,
    args: IS_LINUX
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--disable-gpu']
      : ['--no-first-run', '--disable-extensions']
  }
});

client.on('qr', (qr) => {
  const qrcode = require('qrcode-terminal');
  console.log('[INFO] Scan QR to authenticate:');
  qrcode.generate(qr, { small: true });
});

let lastPct = -1;
client.on('loading_screen', (percent) => {
  if (percent !== lastPct) {
    lastPct = percent;
    console.log(`[LOADING] ${percent}%`);
  }
});

client.on('ready', async () => {
  console.log('[READY] Connected to WhatsApp\n');
  console.log('─'.repeat(55));
  console.log('  LID Lookup Results');
  console.log('─'.repeat(55));

  for (const rawNumber of args) {
    const number = rawNumber.trim().replace(/\D/g, ''); // strip non-digits
    try {
      // Check if number exists on WhatsApp and get their ID
      const result = await client.getNumberId(number);

      if (!result) {
        console.log(`  ✗  ${number.padEnd(20)} → NOT on WhatsApp`);
        continue;
      }

      // result._serialized is like "164957362593944@c.us" or "94776076798@c.us"
      const lid = result._serialized.split('@')[0];
      const type = result.server; // "c.us" = personal, "lid" or different = LID

      console.log(`  ✓  ${number.padEnd(20)} → LID/ID: ${lid}`);

      // Also fetch contact details if available
      try {
        const contact = await client.getContactById(result._serialized);
        if (contact.name || contact.pushname) {
          console.log(`     ${''.padEnd(20)}   Name: ${contact.name || contact.pushname}`);
        }
      } catch (_) { /* contact details optional */ }

    } catch (err) {
      console.log(`  ✗  ${number.padEnd(20)} → Error: ${err.message}`);
    }
  }

  console.log('─'.repeat(55));
  console.log('\n[DONE] Add the LID/ID to your ALLOWED_NUMBERS in .env\n');

  await client.destroy();
  process.exit(0);
});

client.on('auth_failure', () => {
  console.error('[ERROR] Auth failed. Delete .wwebjs_auth and retry.');
  process.exit(1);
});

console.log('[INIT] Connecting to WhatsApp...\n');
client.initialize();
