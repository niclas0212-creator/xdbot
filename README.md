# XDBOT

XDBOT is a futuristic browser chatbot. It can run with a local fallback brain, or connect to real OpenAI models through the included PowerShell backend.

## Deploy To Vercel

This project includes a Vercel serverless API route at `api/chat.js`.

In Vercel project settings, add this environment variable:

```text
OPENAI_API_KEY=your_new_private_key_here
```

Optional:

```text
XDBOT_MODEL=gpt-4.1-mini
```

Do not commit API keys to GitHub.

## Connect Real AI

1. Create an OpenAI API key from the OpenAI dashboard.
2. Open Command Prompt and run:

```bat
setx OPENAI_API_KEY "your_api_key_here"
```

3. Close Command Prompt.
4. Open `start-xdbot.bat`.
5. Go to:

```text
http://127.0.0.1:53124
```

The browser talks to `server.ps1`, and `server.ps1` talks to OpenAI. Your API key stays on your computer and is not placed inside the webpage.

## Optional Model

The default model is `gpt-4.1-mini`. To use another model:

```bat
setx XDBOT_MODEL "gpt-4.1-mini"
```
