const chatWindow = document.querySelector("#chatWindow");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");
const quickActions = document.querySelectorAll("[data-prompt]");
const newChatButton = document.querySelector("#newChatButton");
const clearChatButton = document.querySelector("#clearChatButton");
const regenerateButton = document.querySelector("#regenerateButton");

const STORAGE_KEY = "xdbot-chat-history";
const API_URL =
  window.XDBOT_API_URL ||
  (window.location.protocol.startsWith("http")
    ? "/api/chat"
    : "http://127.0.0.1:53124/api/chat");

const memory = {
  userName: "",
  lastTopic: "",
  greetingCount: 0,
  messages: [],
  personality: "helpful",
};

const knowledgeBase = {
  ai: "AI means artificial intelligence: software that can recognize patterns, answer questions, generate text, help with code, and make decisions from data.",
  bot: "A bot is a program that automatically responds or performs tasks. A chatbot is a bot focused on conversation.",
  chatbot: "A chatbot is an app that reads a user's message, figures out what they want, and replies in a useful conversational way.",
  html: "HTML is the structure of a webpage. It creates elements like headings, buttons, forms, images, and sections.",
  css: "CSS controls how a webpage looks: colors, layout, spacing, fonts, animations, borders, and responsive design.",
  javascript: "JavaScript makes webpages interactive. It reacts to clicks, reads input, changes the page, runs logic, and can talk to APIs.",
  js: "JavaScript makes webpages interactive. It reacts to clicks, reads input, changes the page, runs logic, and can talk to APIs.",
  python: "Python is a beginner-friendly programming language used for automation, websites, apps, data, AI, and scripting.",
  computer: "A computer is a machine that takes input, processes instructions, stores data, and produces output.",
  internet: "The internet is a worldwide network of connected computers that share information using protocols like TCP/IP and HTTP.",
  website: "A website is a group of pages users open in a browser. It usually uses HTML for structure, CSS for style, and JavaScript for interaction.",
  game: "A game is an interactive experience with goals, rules, feedback, and challenge. Good games make each action feel meaningful.",
  xdbot: "XDBOT is this futuristic chat interface. Right now it runs locally in your browser with custom JavaScript logic.",
};

const personalityStyles = {
  helpful: {
    prefix: "",
    closing: "",
  },
  chill: {
    prefix: "Yeah, ",
    closing: " Keep it simple and move one step at a time.",
  },
  serious: {
    prefix: "",
    closing: " The most important part is being specific and testing the result.",
  },
  creative: {
    prefix: "I would shape it like this: ",
    closing: " Give it one memorable detail so it feels alive.",
  },
  teacher: {
    prefix: "Let me explain it clearly. ",
    closing: " A good way to learn it is to try a tiny example right after reading this.",
  },
};

function addMessage(text, sender) {
  const article = document.createElement("article");
  article.className = `message ${sender}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender === "bot" ? "X" : "U";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  bubble.append(paragraph);
  article.append(avatar, bubble);
  chatWindow.append(article);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return article;
}

function saveChat() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory.messages));
}

function rememberMessage(role, content) {
  memory.messages.push({ role, content });
  saveChat();
}

function loadChat() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  if (!saved.length) {
    return;
  }

  chatWindow.innerHTML = "";
  memory.messages = saved;
  saved.forEach((message) => {
    addMessage(message.content, message.role === "assistant" ? "bot" : "user");
  });
}

function setComposerState(isBusy) {
  messageInput.disabled = isBusy;
  chatForm.querySelector("button").disabled = isBusy;
}

async function askRemoteAI(message) {
  if (!API_URL) {
    return "";
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are XDBOT, a helpful futuristic AI assistant. Give direct, useful answers.",
        },
        ...memory.messages,
        { role: "user", content: message },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return data.reply || `XDBOT backend error: HTTP ${response.status}`;
  }

  return data.reply || data.message || data.content || "";
}

function getSentences(message) {
  return message
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getWords(message) {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function getTopic(message) {
  const lowerMessage = message.toLowerCase();
  const patterns = [
    /\bwhat(?:'s| is| are)?\s+(?:a|an|the)?\s*([^?.!]+)/,
    /\bhow\s+(?:do i|to|can i|does|is|are)?\s*([^?.!]+)/,
    /\bwhy\s+(?:does|do|is|are|can)?\s*([^?.!]+)/,
    /\b(?:make|build|create|design|explain|help me with)\s+([^?.!]+)/,
  ];

  for (const pattern of patterns) {
    const match = lowerMessage.match(pattern);

    if (match && match[1]) {
      return match[1]
        .replace(/\b(please|for me|me|it)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  const words = getWords(message).filter(
    (word) =>
      ![
        "the",
        "a",
        "an",
        "is",
        "are",
        "i",
        "you",
        "can",
        "could",
        "would",
        "should",
        "please",
        "help",
        "me",
        "with",
      ].includes(word),
  );

  return words.slice(0, 5).join(" ");
}

function findKnownTopic(message) {
  const words = getWords(message);
  return words.find((word) => knowledgeBase[word]);
}

function updatePersonality(message) {
  const lowerMessage = message.toLowerCase();

  if (/\b(be|act|talk)\s+(chill|casual|relaxed)\b/.test(lowerMessage)) {
    memory.personality = "chill";
    return "chill";
  }

  if (/\b(be|act|talk)\s+(serious|professional|formal)\b/.test(lowerMessage)) {
    memory.personality = "serious";
    return "serious";
  }

  if (/\b(be|act|talk)\s+(creative|imaginative)\b/.test(lowerMessage)) {
    memory.personality = "creative";
    return "creative";
  }

  if (/\b(be|act|talk)\s+(like a teacher|teacher|educational)\b/.test(lowerMessage)) {
    memory.personality = "teacher";
    return "teacher";
  }

  if (/\b(normal|default|helpful)\s+(mode|personality|style)\b/.test(lowerMessage)) {
    memory.personality = "helpful";
    return "helpful";
  }

  return "";
}

function styleReply(reply) {
  const style = personalityStyles[memory.personality] || personalityStyles.helpful;
  return `${style.prefix}${reply}${style.closing}`;
}

function analyzeIntent(message) {
  const lowerMessage = message.toLowerCase();
  const words = getWords(message);
  const hasQuestionMark = message.includes("?");
  const questionWord = words.find((word) =>
    ["what", "why", "how", "when", "where", "who", "which"].includes(word),
  );

  if (/\b(summarize|summary|shorten|recap)\b/.test(lowerMessage)) {
    return "summary";
  }

  if (/\b(write|rewrite|draft|make a sentence|make me|create|story|poem|intro|name idea)\b/.test(lowerMessage)) {
    return "creative";
  }

  if (/\b(code|html|css|javascript|js|python|bug|error|fix|function|script)\b/.test(lowerMessage)) {
    return "coding";
  }

  if (/\b(plan|steps|how to|how do i|build|make|learn|start)\b/.test(lowerMessage)) {
    return "plan";
  }

  if (/\b(should i|opinion|best|better|recommend|which)\b/.test(lowerMessage)) {
    return "advice";
  }

  if (/\b(i feel|sad|angry|stressed|worried|happy|excited|bored)\b/.test(lowerMessage)) {
    return "emotion";
  }

  if (questionWord || hasQuestionMark) {
    return "question";
  }

  if (words.length <= 3) {
    return "short";
  }

  return "conversation";
}

function summarizeText(message) {
  const cleaned = message
    .replace(/\b(summarize|summary|shorten|recap)\b/gi, "")
    .trim();
  const sentences = getSentences(cleaned);

  if (sentences.length > 1) {
    return `Summary: ${sentences.slice(0, 2).join(" ")}${sentences.length > 2 ? " The rest adds extra detail around that main idea." : ""}`;
  }

  return `Summary: ${cleaned || "Send me the text you want summarized and I will condense it."}`;
}

function answerCoding(message) {
  const knownTopic = findKnownTopic(message);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("error") || lowerMessage.includes("bug") || lowerMessage.includes("fix")) {
    return "I read this as a bug or error. The proper way to solve it is: identify the exact error message, find the line it points to, check the variable or element that is missing, then test one small change. Paste the code or error text and I can give a direct fix.";
  }

  if (knownTopic && knowledgeBase[knownTopic]) {
    return `${knowledgeBase[knownTopic]} If you are building with it, start with the smallest working example, then add features one at a time.`;
  }

  return "For code, I need either the goal or the broken code. If your goal is to build something, I can give the structure. If something is broken, paste the error and I will trace it.";
}

function answerAdvice(message) {
  const topic = getTopic(message) || message;

  return `For "${topic}", my honest recommendation is to choose the option that gets you a working result fastest, then improve it. If two choices seem close, pick the one that is easier to test and easier to change later.`;
}

function answerEmotion(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("happy") || lowerMessage.includes("excited")) {
    return "That sounds good. Use that energy while it is fresh: pick one thing you can finish now and turn the excitement into progress.";
  }

  if (lowerMessage.includes("sad") || lowerMessage.includes("stressed") || lowerMessage.includes("worried") || lowerMessage.includes("angry")) {
    return "I hear you. First, slow the problem down: name what happened, name what you can control, then choose one small action. You do not have to solve everything at once.";
  }

  return "I understand. Tell me what happened and I will help you think through it clearly.";
}

function answerGeneral(message) {
  const intent = analyzeIntent(message);
  const knownTopic = findKnownTopic(message);
  const topic = getTopic(message) || memory.lastTopic || message;

  if (intent === "summary") {
    return summarizeText(message);
  }

  if (intent === "coding") {
    return answerCoding(message);
  }

  if (intent === "creative") {
    return `Here is a strong version: ${topic}. Make it clear, give it a distinct style, and add one detail that makes people remember it. If this is for a name, title, intro, or story, I can generate several options.`;
  }

  if (intent === "plan") {
    return `Here is a practical plan for ${topic}:\n1. Decide the exact result.\n2. Make the smallest working version.\n3. Test it and fix what feels wrong.\n4. Add the important features.\n5. Polish the look, wording, and details.`;
  }

  if (intent === "advice") {
    return answerAdvice(message);
  }

  if (intent === "emotion") {
    return answerEmotion(message);
  }

  if (intent === "question") {
    const questionType = getWords(message).find((word) =>
      ["what", "why", "how", "when", "where", "who", "which"].includes(word),
    );

    if (questionType === "what") {
      return answerWhatQuestion(message);
    }

    if (questionType === "how") {
      return answerHowQuestion(message);
    }

    if (questionType === "why") {
      return answerWhyQuestion(message);
    }

    return `The best answer to "${message}" depends on the exact subject, but I can still read the intent: you want a direct explanation. The main thing is ${topic}. Ask with one specific detail and I will answer more precisely.`;
  }

  if (knownTopic && knowledgeBase[knownTopic]) {
    return knowledgeBase[knownTopic];
  }

  if (intent === "short") {
    return `I read "${message}". Tell me a bit more so I can answer it properly, or ask it as a question.`;
  }

  return `I understand your message as being about "${topic}". My response: focus on the main idea, decide what you want from it, and I can help turn it into an explanation, plan, code, creative text, or decision.`;
}

function answerWhatQuestion(message) {
  const knownTopic = findKnownTopic(message);

  if (knownTopic) {
    return knowledgeBase[knownTopic];
  }

  const topic = getTopic(message);

  if (!topic) {
    return "I need one more detail to answer that properly. What thing do you want me to explain?";
  }

  return `${topic} is the main thing your question is about. A good way to understand it is to define what it does, what parts it has, and what problem it solves. Ask me a more specific version and I can go deeper.`;
}

function answerHowQuestion(message) {
  const topic = getTopic(message) || "that";
  const knownTopic = findKnownTopic(message);

  if (knownTopic === "javascript" || knownTopic === "js") {
    return "To learn JavaScript: first learn variables and functions, then arrays and objects, then DOM events, then fetch/API calls. Build a tiny project after each step so it sticks.";
  }

  if (knownTopic === "html" || knownTopic === "css") {
    return `To work with ${knownTopic.toUpperCase()}, start with a simple page, add clear sections, style one section at a time, then test it on phone and desktop sizes.`;
  }

  return `Here is how to approach ${topic}:\n1. Decide the exact result you want.\n2. List the parts needed to make it work.\n3. Build the smallest working version first.\n4. Test it and fix the confusing parts.\n5. Add style, polish, and extra features after it works.`;
}

function answerWhyQuestion(message) {
  const topic = getTopic(message) || "that";

  return `The main reason is usually cause and effect: ${topic} happens because something is creating that result. To find the real reason, check what changed first, what depends on it, and what result appears after.`;
}

function answerComparison(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("html") && lowerMessage.includes("css")) {
    return "HTML and CSS do different jobs: HTML creates the page structure, while CSS makes that structure look good. Think content and layout first, visual style second.";
  }

  if (lowerMessage.includes("javascript") && lowerMessage.includes("python")) {
    return "JavaScript is best for browser interaction and web apps. Python is great for automation, AI, data, and backend scripts. For websites, learn JavaScript first; for general coding, Python is very friendly.";
  }

  return "To compare them properly, look at purpose, difficulty, speed, cost, and what you want to build. The better choice is the one that fits your goal with the least friction.";
}

function answerCreativeRequest(message) {
  const topic = getTopic(message) || "your idea";

  return `Here is a stronger version of ${topic}: make it fast, visual, and easy to understand. Add one signature detail people remember, like a glowing control panel, a dramatic sound effect, or a special ability that changes the whole experience.`;
}

function detectName(message) {
  const match = message.match(/\b(?:my name is|i am|i'm|call me)\s+([a-z][a-z0-9_-]{1,24})/i);
  return match ? match[1] : "";
}

function solveMath(message) {
  const expression = message
    .replace(/x/gi, "*")
    .match(/[-+*/().\d\s]{3,}/);

  if (!expression) {
    return "";
  }

  const cleanExpression = expression[0].trim();

  if (!/^\d[\d\s+\-*/().]*\d$/.test(cleanExpression)) {
    return "";
  }

  try {
    const answer = Function(`"use strict"; return (${cleanExpression})`)();
    return Number.isFinite(answer) ? `${cleanExpression} = ${answer}` : "";
  } catch {
    return "";
  }
}

function makeList(topic) {
  return [
    `Define the exact goal for ${topic}.`,
    "Break it into small tasks you can finish one by one.",
    "Build the first working version before adding extra effects.",
    "Test it, improve the weak parts, then make it look polished.",
  ];
}

function createReply(message) {
  const lowerMessage = message.toLowerCase();
  const name = detectName(message);
  const userMessages = memory.messages.filter((item) => item.role === "user");
  const previousUserMessage = userMessages[userMessages.length - 2]?.content;
  const personality = updatePersonality(message);

  if (personality) {
    return `Personality changed to ${personality}. I will answer in that style from now on.`;
  }

  if (name) {
    memory.userName = name;
    return styleReply(`Nice to meet you, ${name}. I will remember that while this page is open. What do you want to build or talk about first?`);
  }

  if (/\b(what is my name|who am i)\b/.test(lowerMessage)) {
    return styleReply(memory.userName
      ? `Your name is ${memory.userName}.`
      : "I do not know your name yet. Tell me something like: my name is Alex.");
  }

  if (/\b(continue|go on|more|explain more|tell me more)\b/.test(lowerMessage)) {
    return previousUserMessage
      ? `Continuing from "${previousUserMessage}": the next useful layer is to add more detail, examples, and a clear next action. If this is a project, build one feature at a time. If it is a question, ask what part is confusing and focus there.`
      : "I can continue, but I need a topic first. Ask me something, then say 'tell me more'.";
  }

  if (/\b(hi|hello|hey|yo)\b/.test(lowerMessage)) {
    memory.greetingCount += 1;

    if (memory.greetingCount === 1) {
      return styleReply(`Hey${memory.userName ? ` ${memory.userName}` : ""}. I am ready. Ask me anything and I will answer based on your actual message.`);
    }

    return styleReply(`Hello again${memory.userName ? ` ${memory.userName}` : ""}. What do you want help with right now?`);
  }

  if (/\b(time|date|day)\b/.test(lowerMessage)) {
    const now = new Date();
    return styleReply(`Right now it is ${now.toLocaleString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}.`);
  }

  const mathAnswer = solveMath(message);

  if (mathAnswer && /\b(calculate|math|solve|what is|=|\+|-|\*|\/|x)\b/i.test(message)) {
    return styleReply(`The answer is ${mathAnswer}.`);
  }

  if (lowerMessage.includes("intro") || lowerMessage.includes("about xdbot")) {
    return styleReply("XDBOT is a futuristic chat assistant that reads your message, detects what kind of help you want, and answers in the current personality style.");
  }

  if (/\b(difference|better|best|versus|vs)\b/.test(lowerMessage)) {
    return styleReply(answerComparison(message));
  }

  if (/\b(why|how|what|when|where|can you|could you|help)\b/.test(lowerMessage)) {
    memory.lastTopic = getTopic(message) || message;
  }

  memory.lastTopic = getTopic(message) || message;
  return styleReply(answerGeneral(message));
}

function handleSubmit(message) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return;
  }

  addMessage(trimmedMessage, "user");
  rememberMessage("user", trimmedMessage);
  messageInput.value = "";
  setComposerState(true);

  const typingMessage = addMessage("Thinking", "bot");
  typingMessage.classList.add("typing");

  window.setTimeout(async () => {
    let reply = "";

    try {
      reply = await askRemoteAI(trimmedMessage);
    } catch {
      reply = "";
    }

    if (!reply) {
      reply = createReply(trimmedMessage);
    }

    typingMessage.remove();
    addMessage(reply, "bot");
    rememberMessage("assistant", reply);
    setComposerState(false);
    messageInput.focus();
  }, 420);
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSubmit(messageInput.value);
});

quickActions.forEach((button) => {
  button.addEventListener("click", () => {
    handleSubmit(button.dataset.prompt);
  });
});

newChatButton.addEventListener("click", () => {
  memory.messages = [];
  memory.lastTopic = "";
  memory.greetingCount = 0;
  localStorage.removeItem(STORAGE_KEY);
  chatWindow.innerHTML = "";
  addMessage(
    "New chat started. Ask me anything and I will answer with the full XDBOT brain.",
    "bot",
  );
  messageInput.focus();
});

clearChatButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  memory.messages = [];
  chatWindow.innerHTML = "";
});

regenerateButton.addEventListener("click", () => {
  const lastUserMessage = [...memory.messages]
    .reverse()
    .find((message) => message.role === "user");

  if (lastUserMessage) {
    handleSubmit(lastUserMessage.content);
  }
});

loadChat();
