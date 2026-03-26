# Nourish - Smart Food Companion

AI-powered food tracking app that scans meals for calories, manages your fridge inventory, and suggests meals based on what you have.

## Features

- **Meal Scanner** - Upload food photos and get instant calorie/macro breakdowns via Claude AI
- **Fridge Inventory** - Scan your fridge with a photo or add items manually. Persists across sessions.
- **Meal Planner** - Get 3 meal ideas based on your fridge contents, with a shopping list for missing ingredients
- **6 Themes** - Rose Gold, Lavender, Sage, Ocean, Latte, and Midnight (dark mode)

## Deploy to Vercel (2 minutes)

1. Push this folder to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new) and import it
3. Add your environment variable:
   - `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
4. Click Deploy

That's it! Your app will be live at `your-project.vercel.app`.

## Run Locally

```bash
npm install
cp .env.example .env
# Edit .env and add your Anthropic API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

The frontend sends images and requests to a Next.js API route (`/api/claude`), which securely forwards them to the Anthropic API using your server-side API key. Your key is never exposed to the browser.

## Cost

Each image analysis costs roughly $0.01-0.03 in API credits (using Claude Sonnet). Meal planning (text only) costs less than $0.01 per request.
