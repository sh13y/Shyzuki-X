# 🤖 WhatsApp Auto-Reply Bot

[![Build & Push Docker Image](https://github.com/sh13y/Shyzuki-X/actions/workflows/docker-build.yml/badge.svg)](https://github.com/sh13y/Shyzuki-X/actions/workflows/docker-build.yml)
[![Docker Image](https://ghcr-badge.egpl.dev/sh13y/shyzuki-x/size)](https://github.com/sh13y/Shyzuki-X/pkgs/container/shyzuki-x)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Because replying manually is so 2020.

Built with [whatsapp-web.js](https://github.com/wwebjs/whatsapp-web.js). This little guy sits on your server 24/7 and sends a reply to the people you actually care about (or want to scare off). Everyone else? Ignored. Cold. Ruthless. 😈

> ⚠️ **Disclaimer**: This uses whatsapp-web.js, an *unofficial* WhatsApp library. WhatsApp/Meta didn't make this, didn't approve this, and probably doesn't love this. Use at your own risk. Your account *could* get banned, though for a simple personal bot it's very unlikely. Don't blame us if it does. 😅

---

## ✨ What This Bad Boy Can Do

- 💬 Replies **only** to your whitelisted numbers. Strangers get the silent treatment
- ✏️ Change the reply message anytime from `.env`. No touching code, ever
- 🧠 Remembers your login. Scan QR once, never again (unless you mess things up)
- 🌐 Supports Sinhala, Tamil, Emoji. Reply in any language you want (හෙලෝ! 👋)
- 🚫 Ignores groups, ignores itself. No infinite loop disasters
- 🐳 Runs on **aaPanel / Linux VPS** via Docker like a proper adult

---

## 📁 What's Inside the Box

```
whatsapp-bot/
├── .github/
│   └── workflows/
│       └── docker-build.yml      # Robots build your Docker image automatically
├── index.js                      # The brain of the operation
├── find-lid.js                   # Find someone's WhatsApp ID (stalker mode 👀)
├── Dockerfile                    # Blueprint for the Docker container
├── docker-compose.yml            # Local / build-from-source setup
├── docker-compose.server.yml     # aaPanel server setup (pulls from ghcr.io)
├── ecosystem.config.js           # PM2 config (if you're allergic to Docker)
├── .env                          # YOUR secrets - don't commit this, seriously
├── .env.example                  # Safe template to share with the world
└── .gitignore                    # The bouncer that keeps .env off GitHub
```

---

## ⚙️ Configuration (`.env`)

```bash
cp .env.example .env
nano .env   # or open it however you like
```

```env
# Who gets a reply? Put their LID or phone number here (no + sign, no spaces)
# Multiple numbers? Separate with commas like a civilized person
ALLOWED_NUMBERS=112233445566778,998877665544332

# What do you want to say? Go wild. Unicode, Emoji, Sinhala - all good.
REPLY_MESSAGE=Hello! I will get back to you soon. 😊
```

> 🤔 **Not sure what LID is?** See [Finding a WhatsApp LID](#-finding-a-whatsapp-lid) below. WhatsApp got fancy with privacy stuff.

---

## 🚀 Quick Start (Local / Windows)

For when you just want to test this thing without the whole server drama:

```bash
npm install
cp .env.example .env   # set your numbers and message
node index.js          # scan the QR and watch the magic happen
```

That's it. Seriously.

---

## 🌐 Deploy to aaPanel via GitHub (The Cool Way)

Push once to GitHub → GitHub robots build your Docker image → aaPanel pulls and runs it. Update the bot forever with just two commands. Chef's kiss. 🤌

### Step 1 — Push to GitHub

Do this once from your local machine:

```bash
cd whatsapp-bot

git init
git add .
git commit -m "first commit, here we go 🚀"

# Create a repo on github.com FIRST, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2 — Make the GitHub Package Public

After pushing, your Docker image gets built automatically. Now make it accessible:

1. Go to your GitHub repo → look for **Packages** in the right sidebar
2. Click your package → **Package settings**
3. Scroll down to **Danger Zone** → Change visibility → **Public**

> 🔒 Keeping it private? Fine, but you'll need to log into ghcr.io on your server. See the Troubleshooting section at the bottom.

### Step 3 — Wait for GitHub Actions to Build

Go to your repo -> **Actions** tab -> watch the `Build & Push Docker Image` workflow turn green ✅ (takes ~2-3 min).

Once green, your image lives at:
```
ghcr.io/YOUR_USERNAME/YOUR_REPO_NAME:latest
```

### Step 4 — Set Up on aaPanel Server

SSH into your server and run:

```bash
# Install Docker if you haven't already (it's 2026, why don't you have Docker?)
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Make a home for the bot
mkdir -p /www/wwwroot/whatsapp-bot
cd /www/wwwroot/whatsapp-bot

# Grab the files straight from your GitHub repo
curl -o docker-compose.server.yml https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/docker-compose.server.yml
curl -o .env.example https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/.env.example
```

### Step 5 — Edit the Compose File

```bash
nano docker-compose.server.yml
```

Find this line and replace with your actual GitHub username and repo:
```yaml
image: ghcr.io/YOUR_USERNAME/YOUR_REPO_NAME:latest
```

### Step 6 — Create Your `.env` on the Server

```bash
cp .env.example .env
nano .env
```

```env
ALLOWED_NUMBERS=112233445566778
REPLY_MESSAGE=Hello! This is an auto-reply. I will get back to you soon. 🤖
```

### Step 7 — Scan the QR (First Time Only, Promise)

```bash
# Pull the image from GitHub
docker compose -f docker-compose.server.yml pull

# Run it interactively so you can scan the QR code
docker compose -f docker-compose.server.yml run --rm -it whatsapp-bot
```

Open WhatsApp -> **Linked Devices** -> **Link a Device** -> scan the QR.

Wait for `[READY] WhatsApp bot is online` then press `Ctrl+C`.

Session is saved in `./session/` — you're done with QR codes forever. 🎉

### Step 8 — Set It Free

```bash
docker compose -f docker-compose.server.yml up -d
```

The bot is now alive, running 24/7, auto-restarting if it trips over itself. Go get some sleep. 😴

---

## 🔄 Updating the Bot (Super Easy)

Made changes? Pushed to GitHub? Just run these two commands on your server:

```bash
cd /www/wwwroot/whatsapp-bot
docker compose -f docker-compose.server.yml pull
docker compose -f docker-compose.server.yml up -d
```

That's literally it. The new image gets pulled, the old container gets replaced. Your session stays intact. Beautiful.

---

## 🛠️ Handy Docker Commands

```bash
# Watch what the bot is up to (live logs)
docker compose -f docker-compose.server.yml logs -f

# Give it a kick
docker compose -f docker-compose.server.yml restart

# Put it to sleep
docker compose -f docker-compose.server.yml down

# Wake it up again
docker compose -f docker-compose.server.yml up -d

# Is it even alive?
docker ps
```

---

## 🔍 Finding a WhatsApp LID

WhatsApp decided in 2023 that phone numbers are too mainstream. Now they use random-looking **LIDs** (Linked Device Identifiers) for privacy. Your real number gets mapped to a long random-looking ID behind the scenes. Fun, right? 🙃

**Method 1 - Use the lookup tool** (stop the bot first):
```bash
node find-lid.js 94XXXXXXXXX
```

Output:
```
  ✓  94XXXXXXXXX    -> LID/ID: 112233445566778
                      Name: Someone
```

**Method 2 - Just send a test message:**
The bot logs every incoming message. You will see something like:
```
[MSG] | ID: 112233445566778 | Text: "test"
[TIP]  If this is you, add "112233445566778" to ALLOWED_NUMBERS in .env
```
Copy that ID. Done.

---

## 🐌 Alternative: Run with PM2 (No Docker)

If Docker scares you, here's the old-school way:

```bash
# Install stuff
npm install
npm install -g pm2

# Scan QR once
node index.js   # Ctrl+C after scanning

# Hand it over to PM2
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # run the command it tells you to run
```

---

## 📞 Phone Number Format

No `+`, no spaces, no dashes. Just digits. It's not that deep.

| Country | Number | Format for `.env` |
|---|---|---|
| 🇱🇰 Sri Lanka | +94 7X-XXX-XXXX | `947XXXXXXXX` |
| 🇲🇾 Malaysia | +60 1X-XXX-XXXX | `601XXXXXXXX` |
| 🇮🇳 India | +91 9X-XXXX-XXXX | `919XXXXXXXX` |
| 🇮🇩 Indonesia | +62 8XX-XXXX-XXX | `628XXXXXXXX` |
| 🇺🇸 USA | +1 (XXX) XXX-XXXX | `1XXXXXXXXXX` |

---

## 🩹 Troubleshooting

**Stuck at 99% loading? Classic.**
```bash
rm -rf .wwebjs_auth session
node index.js   # re-scan QR
```

**`Error: Failed to launch the browser process` on bare server (no Docker)**
```bash
sudo apt install -y chromium-browser libgbm-dev libnss3 libxss1
```

**Bot not replying to you**
- Check your `ALLOWED_NUMBERS` - it is probably the LID, not your phone number
- Use `node find-lid.js YOUR_NUMBER` to find the right ID
- Check logs: `docker compose -f docker-compose.server.yml logs -f`

**Private GitHub repo - need to log into ghcr.io on server**
```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```
Get a token: GitHub -> Settings -> Developer settings -> Personal access tokens -> `read:packages`

---

<div align="center">

2026 &nbsp;|&nbsp; Made in Ceylon with ❤️ by **sh13y**

</div>
