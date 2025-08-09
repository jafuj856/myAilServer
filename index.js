import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import OpenAI from "openai";
import fetch from "node-fetch";
import { chatWithPersonalBot } from "./aiResponse.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// ---------- Middleware ----------
app.use(bodyParser.json());
app.use(cors({ origin: "*", credentials: true }));

// ---------- OpenAI Setup ----------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Profile & Memory ----------
const conversationHistory = {};
const PROFILE =
  process.env.MY_PROFILE ||
  "I am Jafar, a MERN stack developer and React team lead.";

// Load history from file if exists
if (fs.existsSync("history.json")) {
  Object.assign(
    conversationHistory,
    JSON.parse(fs.readFileSync("history.json"))
  );
}

// Save history periodically
setInterval(() => {
  fs.writeFileSync(
    "history.json",
    JSON.stringify(conversationHistory, null, 2)
  );
}, 60 * 1000);

// ---------- Helpers ----------
const sendErrorResponse = (res, statusCode, message, error = null) => {
  console.error(`Error: ${message}`, error);
  res.status(statusCode).json({
    success: false,
    error: message,
    details: error ? error.toString() : null,
  });
};

// Detect if someone is asking about you
const isAskingAboutMe = (text) => {
  return /who\s+are\s+you|about\s+you|what\s+do\s+you\s+do|who\s+is\s+jafar/i.test(
    text
  );
};

// Get AI response

async function getAIResponse(userId, userMessage) {
  // Ensure history exists for this user
  if (!conversationHistory[userId]) {
    conversationHistory[userId] = [];
  }

  // Save the new user message
  conversationHistory[userId].push({ role: "user", content: userMessage });

  // If they ask about you, reply with your profile directly
  if (isAskingAboutMe(userMessage)) {
    return PROFILE;
  }

  // Call Hugging Face Inference API instead of OpenAI
  try {
    const HF_API_KEY = process.env.HUGGINGFACE_API_KEY; // Set your HF API key in .env
    const response = await fetch(
      "https://api-inference.huggingface.co/models/gpt2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: userMessage }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Hugging Face API error:", data.error);
      return "Sorry, I couldn't generate a reply right now.";
    }

    // The generated text is usually in data.generated_text
    const aiReply =
      data.generated_text || "Sorry, I couldn't generate a reply.";

    // Save AI reply in history
    conversationHistory[userId].push({ role: "assistant", content: aiReply });

    return aiReply;
  } catch (error) {
    console.error("Error calling Hugging Face API:", error);
    return "Sorry, there was an error generating a reply.";
  }
}

// ---------- Prtifolio chat bot setup --------------
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
      return sendErrorResponse(res, 400, "Missing message or sessionId");
    }

    // Get AI reply
    const aiResponse = await chatWithPersonalBot(message);
    console.log(aiResponse);

    res.status(200).json({
      success: true,
      reply: aiResponse,
    });
  } catch (error) {
    sendErrorResponse(res, 500, "Error generating AI response", error);
  }
});

// ---------- WhatsApp Webhook Verification ----------
app.get("/webhook", (req, res) => {
  const {
    "hub.mode": mode,
    "hub.verify_token": token,
    "hub.challenge": challenge,
  } = req.query;

  if (!mode || !token || !challenge) {
    return sendErrorResponse(
      res,
      400,
      "Invalid webhook verification parameters"
    );
  }

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  sendErrorResponse(res, 403, "Webhook verification failed");
});

// ---------- WhatsApp Message Handling ----------
app.post("/webhook", async (req, res) => {
  try {
    if (!req.body || !req.body.message || !req.body.sender) {
      return sendErrorResponse(res, 400, "Invalid request body");
    }

    const { message, sender } = req.body;

    // Get AI-generated reply
    const aiResponse = await getAIResponse(sender, message);

    // Optional: Send back to WhatsApp
    // await axios.post(
    //   `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
    //   {
    //     messaging_product: "whatsapp",
    //     to: sender,
    //     type: "text",
    //     text: { body: aiResponse },
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );

    res.status(200).json({
      success: true,
      reply: aiResponse,
      sender,
    });
  } catch (error) {
    sendErrorResponse(res, 500, "Unexpected error processing webhook", error);
  }
});

// ---------- Error Handler ----------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    details: process.env.NODE_ENV === "development" ? err.toString() : null,
  });
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
