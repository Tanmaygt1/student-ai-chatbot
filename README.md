# VIT Assistant — Vishwakarma Institute of Technology Chatbot
**Author: Tanmay** | Built with Next.js + Vercel

AI-powered student chatbot for VIT Pune. Real data from vit.edu, context-aware conversations, one-click Vercel deploy.

## Get API Key
1. Go to https://console.x.ai → Sign in
2. Left menu → "API Keys" → "Create API Key"
3. Copy key (starts with `xai-...`)
4. Paste in `.env.local`: `AI_API_KEY=xai-YOUR_KEY`

## Run Locally
```bash
npm install
# Edit .env.local with your key
npm run dev        # http://localhost:3000
npm run scrape     # Refresh VIT live data
```

## Push to GitHub
```bash
git init
git add .
git commit -m "VIT Chatbot by Tanmay"
git remote add origin https://github.com/YOUR_USERNAME/vit-chatbot.git
git push -u origin main
```

## Deploy to Vercel
1. vercel.com → New Project → Import GitHub repo
2. Add Environment Variable: `AI_API_KEY` = your key
3. Deploy!

## Fix: API Key on Windows
`set` command doesn't persist. Use `.env.local` file instead:
```
AI_API_KEY=xai-your-key-here
```
Then `npm run dev`.

## Add Your Own Data
Edit `lib/data.json` — all VIT info lives there.
Run `npm run scrape` to refresh from vit.edu.
