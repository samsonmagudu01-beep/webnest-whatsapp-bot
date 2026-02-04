const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const VERIFY_TOKEN = "webnest_verify";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ===== HEALTH CHECK (IMPORTANT FOR RENDER) =====
app.get("/", (req, res) => {
  res.status(200).send("WebNest bot is running");
});

// ===== WEBHOOK VERIFY =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ===== BOT LOGIC =====
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

    let reply =
      "Hi 👋 Thanks for contacting WebNest Media.\n\nI’m currently unavailable, but I’ll respond shortly. Feel free to share what you’re looking for in the meantime.";

    if (text.includes("not interested")) {
      reply =
        "No worries at all 👍 Thanks for letting me know. If anything changes, feel free to reach out.\n\n– WebNest Media";
    }

    await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply },
      }),
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("BOT ERROR:", err);
    res.sendStatus(200);
  }
});

// ===== START SERVER (CRITICAL) =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`WebNest bot listening on port ${PORT}`);
});
