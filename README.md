# FB Campaign Engine — Leverage100x

AI-powered monthly Facebook campaign generator for **two services** running on **two pages** over a **90-day sales campaign**.

## Services & Pages

| Service | Facebook Page | Price |
|---------|--------------|-------|
| 7-Day Fast Track (EA trading setup) | facebook.com/leverage100 | 9,900 THB |
| นัท X-Ray ธุรกิจ (business consulting) | facebook.com/businessxray | 36K–50K/mo or 360K/yr |

## How it works

1. **Pick a month** — choose which page/service to campaign for
2. **Generate** — Claude plans all post topics, writes full Thai copy, creates image prompts
3. **Review** — edit any post, generate images with Gemini, adjust CTAs
4. **Schedule** — one click sends all posts to Buffer at your chosen posting days/times

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

```bash
vercel
```

Or connect GitHub repo → Vercel dashboard (auto-detects Next.js).

## Deploy to Railway

Push to GitHub → Railway → New Project → Deploy from Repo.

## Environment Variables (optional — all keys can be entered in the app UI)

Copy `.env.example` to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
BUFFER_ACCESS_TOKEN=...
GEMINI_API_KEY=...
```

## API Keys

- **Anthropic**: console.anthropic.com → API Keys
- **Buffer**: buffer.com → Settings → Apps → Access Token. Find profile IDs: `GET https://api.bufferapp.com/1/profiles.json?access_token=YOUR_TOKEN`
- **Gemini (optional)**: aistudio.google.com → API Keys (for image generation via Imagen 3)

## 90-Day Campaign Strategy

The engine is pre-loaded with your full brand context:
- Month 1: Awareness + trust building
- Month 2: Expertise + desire creation  
- Month 3: Conversions + urgency + proof

Each monthly campaign auto-balances content across 4 pillars:
- 40% EA Fundamentals / Business Problems
- 25% Strategy & Analysis / Systems
- 20% Mindset & Risk / Leadership
- 15% Behind the Scenes / Proof

All posts are written in Thai, service-specific, with the right CTA for that stage.
