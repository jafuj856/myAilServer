import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { Client } from "@gradio/client";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(bodyParser.json());
app.use(
    cors({
        origin:'*', 
        //     [
        //     "http://localhost:5173",
        //     "https://myailserver.onrender.com",
        //     "https://my-ai-react-app-ycm9.vercel.app",
        // ],
        credentials: true,
    }))

// Centralized error response function
const sendErrorResponse = (res, statusCode, message, error = null) => {
  console.error(`Error: ${message}`, error);
  res.status(statusCode).json({
    success: false,
    error: message,
    details: error ? error.toString() : null,
  });
};

// Function to get AI response from Hugging Face using @gradio/client
async function getAIResponse(userMessage) {
  if (!userMessage) {
    throw new Error("No message provided");
  }

  try {
    const client = await Client.connect("https://jafuj856-chatbot.hf.space");

    // Call the predict method to get the response
    const result = await client.predict("/predict", [userMessage]);

    if (!result || !result.data) {
      throw new Error("Invalid response from AI");
    }

    return result.data;
  } catch (error) {
    console.error("Hugging Face API Error:", error);
    throw new Error("AI service is currently unavailable");
  }
}

// WhatsApp Webhook Verification
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
    res.status(200).send(challenge);
  } else {
    sendErrorResponse(res, 403, "Webhook verification failed");
  }
});

// WhatsApp Webhook (Receive messages & reply)
app.post("/webhook", async (req, res) => {
  try {
    // Validate request body
    if (!req.body || !req.body.message) {
      return sendErrorResponse(res, 400, "Invalid request body");
    }

    const { message } = req.body;
    const sender = "9633537712"; // Consider moving this to a more dynamic source

    // Get AI-generated response
    const aiResponse = await getAIResponse(message);

    // Successful response
    res.status(200).json({
      success: true,
      api: "OK",
      message: aiResponse,
      sender: sender,
    });
  } catch (error) {
    // Handle different types of errors
    if (error.message === "No message provided") {
      sendErrorResponse(res, 400, error.message);
    } else if (error.message === "AI service is currently unavailable") {
      sendErrorResponse(res, 503, error.message);
    } else {
      sendErrorResponse(res, 500, "Unexpected error processing webhook", error);
    }
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    details: process.env.NODE_ENV === "development" ? err.toString() : null,
  });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  app.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
// Send AI response back to WhatsApp
// await axios.post(
//   `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
//   {
//     messaging_product: "whatsapp",
//     to: sender, // Reply back to the sender
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

// console.log(
//   `Sent response to ${sender}: ${aiResponse.substring(0, 50)}...`
// );
