export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ reply: "Method not allowed" });
  }

  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!googleApiKey) {
    return response.status(500).json({
      reply:
        "XDBOT backend error: GOOGLE_API_KEY is not set in Vercel project settings.",
    });
  }

  try {
    const messages = Array.isArray(request.body?.messages)
      ? request.body.messages
      : [];

    const contents = messages
      .filter((message) => message?.role && message?.content)
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: String(message.content) }],
      }));

    const model = process.env.XDBOT_MODEL || "gemini-3.5-flash";
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
      method: "POST",
      headers: {
        "x-goog-api-key": googleApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "You are XDBOT, a futuristic AI chatbot with a chill, friendly personality. Answer like a real helpful AI. Analyze the user's whole message, stay in context, adapt personality when asked, and give direct useful answers. Keep the vibe relaxed, clear, and useful. Do not say you processed the text unless that is genuinely useful.",
            },
          ],
        },
        contents,
        generationConfig: {
          maxOutputTokens: 700,
        },
      }),
    },
    );

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      return response.status(aiResponse.status).json({
        reply:
          data?.error?.message ||
          `XDBOT backend error: Google Gemini returned HTTP ${aiResponse.status}`,
      });
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join("\n")
        .trim();

    return response.status(200).json({
      reply: text || "I connected to the AI, but the response was empty.",
    });
  } catch (error) {
    return response.status(500).json({
      reply: `XDBOT backend error: ${error.message}`,
    });
  }
}
