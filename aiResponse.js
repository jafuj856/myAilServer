import dotenv from "dotenv";
import { PromptTemplate } from "@langchain/core/prompts";
import axios from "axios";

dotenv.config();
const GRK_API_KY = process.env.GRK_API_KY;

class GroqLLM {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("❌ Missing Groq API Key! Please set GRK_API_KY in .env");
    }
    this.apiKey = apiKey;
  }

  async call(prompt) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );
      return response.data.choices?.[0]?.message?.content || "No response.";
    } catch (error) {
      console.error(
        "❌ Groq API Error:",
        error.response?.data || error.message
      );
      return "⚠️ Sorry, I’m facing an issue. Please try again later.";
    }
  }
}

const llm = new GroqLLM(GRK_API_KY);
const supportedLangs = {
  english: "en",
  malayalam: "ml",
  arabic: "ar",
};

const jafarBio = `
Jafar is a passionate MERN stack developer and React team lead with over 3 years of experience.
- Skilled in MongoDB, Express, React, Node.js, Flutter, MySQL, and MongoDB.
- Led projects like a   AI-powered resume/job assistants, and voice/face recognition apps.
- Values teamwork, clean code, and AI integrations.
Currently focusing on Artificial Intelligence and chatbot development. his contact information:
- Email:jafuj856@gmail.com
- LinkedIn: https://www.linkedin.com/in/jafar-parayil-56481216b
- GitHub: https://github.com/jafuj856
- phone: +91 9633537712
`;

export const chatWithPersonalBot = async (userMessage, lang = "en") => {
  if (!supportedLangs[lang]) lang = "en";

  try {
    const template = new PromptTemplate({
      inputVariables: ["question"],
      template: `
You are Jafar’s personal AI assistant and profasional . 
Always reply in **${supportedLangs[lang]}** only.

- If the user asks about Jafar (directly or indirectly), introduce him using this info:
${jafarBio}

👉 Make the intro sound natural, engaging, and not robotic.
👉 Do NOT say "I am Jafar". You are his assistant introducing him.

- If the user asks a general question, answer clearly and briefly.
-if user asks about jafar then provide contact information with his indtroduction and higlight contact information in first.
- if user asks in arabic his currect word جعفر.
- if user asks in malayalam his currect word ജാഫർ.
- If it’s just chatting, respond in a friendly and engaging way.
- Keep answers concise and pleasant.
- After each reply, you may politely ask if they want to know more about Jafar.
Question: {question}
Answer:`,
    });

    const formattedPrompt = await template.format({ question: userMessage });
    const result = await llm.call(formattedPrompt);
    return await result;
  } catch (error) {
    console.error("❌ Bot Error:", error.message);
    return await translateText(
      "⚠️ Sorry, I’m facing some issues. Please chat with me later.",
      lang
    );
  }
};
