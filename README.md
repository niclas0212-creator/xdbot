# XDBOT

XDBOT is a futuristic browser chatbot. It can run with a local fallback brain, or connect to Google Gemini through the included backend.

## Deploy To Vercel

This project includes a Vercel serverless API route at `api/chat.js`.

In Vercel project settings, add this environment variable:

```text
GOOGLE_API_KEY=your_new_private_key_here
```

Optional:

```text
XDBOT_MODEL=gemini-3.5-flash
```

Do not commit API keys to GitHub.

## Connect Real AI

1. Create a Google Gemini API key from Google AI Studio.
2. Open Command Prompt and run:

```bat
setx GOOGLE_API_KEY "your_api_key_here"
```

3. Close Command Prompt.
4. Open `start-xdbot.bat`.
5. Go to:

```text
http://127.0.0.1:53124
```

The browser talks to `server.ps1`, and `server.ps1` talks to Google Gemini. Your API key stays on your computer and is not placed inside the webpage.

## Optional Model

The default model is `gemini-3.5-flash`. To use another model:

```bat
setx XDBOT_MODEL "gemini-3.5-flash"
```
