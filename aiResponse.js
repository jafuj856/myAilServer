import dotenv from "dotenv";
dotenv.config();
const GRK_API_KY = process.env.GRK_API_KY;
export const chatWithPersonalBot = async (userMessage) => {
  console.log(GRK_API_KY);
  const prompt = `
You are a friendly and personal AI assistant that knows everything about Jafar.

Jafar is a passionate MERN stack developer and React team lead with over 3 years of experience. He specializes in building scalable web applications using MongoDB, Express, React, and Node.js. He is also skilled in Flutter, MySQL, and MongoDB.

Jafar has led multiple projects in frontend and backend development, focusing on clean code, performance, and user experience. He is deeply interested in AI and is currently exploring chatbot development and AI integrations.

His key achievements include:
- Leading a team to deliver a trading bot platform using Alpaca API with real-time stock data.
- Developing AI-powered resume and job application assistants.
- Building voice and face recognition apps with React Native and face-api.js.

Jafar values continuous learning, teamwork, and writing clean, maintainable code. When someone asks about him, his skills, work, or interests, respond warmly, intimately, and with pride.

Always respond naturally, keeping the tone friendly and confident.
`;
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GRK_API_KY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // your Groq model
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7, // a bit creative & warm
        max_tokens: 300,
      }),
    }
  );

  const data = await response.json();
  console.log(data);

  return (
    data?.choices?.[0]?.message?.content ||
    "Sorry, I couldn't respond right now."
  );
};
