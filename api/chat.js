export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ reply: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({
      reply:
        "XDBOT backend error: OPENAI_API_KEY is not set in Vercel project settings.",
    });
  }

  try {
    const messages = Array.isArray(request.body?.messages)
      ? request.body.messages
      : [];

    const input = [
      {
        role: "developer",
        content:
          "You are XDBOT, a futuristic AI chatbot. Answer like a real helpful AI. Analyze the user's whole message, stay in context, adapt personality when asked, and give direct useful answers. Do not say you processed the text unless that is genuinely useful.",
      },
      ...messages
        .filter((message) => message?.role && message?.content)
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: String(message.content),
        })),
    ];

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XDBOT_MODEL || "gpt-4.1-mini",
        input,
        max_output_tokens: 700,
      }),
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      return response.status(aiResponse.status).json({
        reply:
          data?.error?.message ||
          `XDBOT backend error: OpenAI returned HTTP ${aiResponse.status}`,
      });
    }

    const text =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        .map((content) => content.text)
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
