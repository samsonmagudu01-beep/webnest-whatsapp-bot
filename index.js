import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===== CONFIG =====
const VERIFY_TOKEN = "webnest_verify";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ===== WEBHOOK VERIFY (GET) =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ===== RECEIVE MESSAGES (POST) =====
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message || message.type !== "text") {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text.body.toLowerCase();

    let reply = "";

    // ❌ Not interested
    if (text.includes("not interested")) {
      reply =
        "No worries at all 👍 Thanks for letting me know. If things change in the future, feel free to reach out anytime.\n\n– WebNest Media";

    // ✅ Interested in website / mockup
    } else if (
      text.includes("website") ||
      text.includes("mockup") ||
      text.includes("web")
    ) {
      reply =
        "Great 😊 I specialise in clean, high-converting website mockups.\n\nTo get started, could you please share:\n• Your business name\n• Any reference websites\n• Logo or brand colours (if any)\n• What the website is meant to achieve\n\nI’ll take it from there.\n\n– WebNest Media";

    // ℹ️ Default auto-reply
    } else {
      reply =
        "Hi 👋 Thanks for reaching out to WebNest Media.\n\nI’m currently unavailable but I’ll get back to you shortly. In the meantime, feel free to share what you’re looking for so we can move faster.\n\n– WebNest Media";
    }

    // ===== SEND MESSAGE =====
    await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          text: { body: reply },
        }),
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot running on port", PORT));

