# WhatsApp Auto-Reply Bot

A simple WhatsApp bot built with [whatsapp-web.js](https://github.com/wwebjs/whatsapp-web.js) that automatically replies to messages from specific phone numbers only.

---

## Features

- ✅ Replies **only** to whitelisted phone numbers
- ✅ Configurable reply message (no code changes needed)
- ✅ Session persistence — no need to re-scan QR on restart
- ✅ Runs on **aaPanel / Linux VPS** with PM2
- ✅ Ignores group messages and own messages

---

## Project Structure

```
whatsapp-bot/
├── index.js              # Main bot logic
├── .env                  # Your config (create from .env.example)
├── .env.example          # Config template
├── ecosystem.config.js   # PM2 config for aaPanel
├── package.json
└── .gitignore
```

---

## Quick Start (Local)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Phone number(s) to whitelist — country code + number, no +, no spaces
ALLOWED_NUMBERS=60123456789

# To allow multiple numbers, separate with commas:
# ALLOWED_NUMBERS=60123456789,60198765432

# Message to send as auto-reply
REPLY_MESSAGE=Hello! This is an automated reply. I will get back to you shortly.
```

### 3. Run the bot

```bash
npm start
```

Scan the QR code that appears in the terminal using **WhatsApp → Linked Devices → Link a Device**.

---

## aaPanel Deployment Guide

### Prerequisites on your server

```bash
# Install Node.js (v18+) via aaPanel Software Store, or:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chromium (required by Puppeteer/whatsapp-web.js)
sudo apt-get install -y \
  chromium-browser \
  libgbm-dev \
  libxkbcommon-x11-0 \
  libgtk-3-0 \
  libnss3 \
  libxss1 \
  libasound2

# Install PM2 globally
npm install -g pm2
```

### Upload & Setup

```bash
# 1. Upload the project folder to your server (e.g. /www/wwwroot/whatsapp-bot)
cd /www/wwwroot/whatsapp-bot

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
nano .env   # Edit with your allowed numbers and reply message
```

### First Run (QR Code Scan)

You must do this step interactively the first time:

```bash
node index.js
```

Scan the QR code. Once you see `[READY] WhatsApp bot is online`, press `Ctrl+C`.

> **Note:** After scanning, the session is saved in `.wwebjs_auth/`. The bot will stay logged in on future starts without needing to scan again.

### Start with PM2 (persistent, auto-restart)

```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list (so it survives server reboots)
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs after this
```

### Useful PM2 Commands

```bash
pm2 status                    # Check bot status
pm2 logs whatsapp-bot         # View live logs
pm2 logs whatsapp-bot --lines 100   # Last 100 log lines
pm2 restart whatsapp-bot      # Restart the bot
pm2 stop whatsapp-bot         # Stop the bot
pm2 delete whatsapp-bot       # Remove from PM2
```

---

## Configuration Reference

| Variable | Required | Description |
|---|---|---|
| `ALLOWED_NUMBERS` | ✅ Yes | Comma-separated phone numbers (country code + number, no `+`) |
| `REPLY_MESSAGE` | ✅ Yes | The auto-reply text to send |
| `SESSION_PATH` | No | Custom path for session files (default: `.wwebjs_auth`) |

---

## Phone Number Format

WhatsApp uses numbers in format `{countrycode}{number}` without any `+`, spaces, or dashes.

| Country | WhatsApp Number | Written as |
|---|---|---|
| Malaysia | +60 12-345 6789 | `60123456789` |
| India | +91 98765 43210 | `919876543210` |
| Indonesia | +62 812-3456-789 | `628123456789` |
| USA | +1 (555) 123-4567 | `15551234567` |

---

## Troubleshooting

**`Error: Failed to launch the browser process`**
- Install Chromium: `sudo apt install chromium-browser`
- Or install missing libs: `sudo apt-get install -y libgbm-dev libnss3 libxss1`

**`Session expired / QR keeps appearing`**
- Delete the session folder and re-scan: `rm -rf .wwebjs_auth && node index.js`

**Bot not replying**
- Check the number format in `.env` — must be digits only, no `+`
- Check logs: `pm2 logs whatsapp-bot`
- Make sure the message is not from a group (bot ignores groups)

**Running behind aaPanel firewall**
- No inbound ports are needed — the bot connects outbound only
