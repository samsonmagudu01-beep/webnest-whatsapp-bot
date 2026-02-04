const express = require("express");
const fetch = require("node-fetch");

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

// ===== SIMPLE IN-MEMORY LEADS =====
const leads = {};

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
    const text = message.text.body.trim();

    if (!leads[from]) {
      leads[from] = { step: 0 };
    }

    let reply = "";

    // ❌ Not interested
    if (text.toLowerCase().includes("not interested")) {
      reply =
        "No worries at all 👍 Thanks for letting me know. If anything changes, feel free to reach out.\n\n– WebNest Media";
      delete leads[from];
    }

    // STEP 0
    else if (leads[from].step === 0) {
      reply =
        "Thanks for getting back to me 😊\n\nTo create a proper website mockup, I just need a few quick details.\n\nFirst — what’s the *business name*?";
      leads[from].step = 1;
    }

    // STEP 1
    else if (leads[from].step === 1) {
      leads[from].businessName = text;
      reply =
        "Got it 👍\n\nWhat type of business is this? (e.g. clinic, barber, restaurant, agency)";
      leads[from].step = 2;
    }

    // STEP 2
    else if (leads[from].step === 2) {
      leads[from].businessType = text;
      reply =
        "Nice.\n\nDo you have any *reference websites* you like? You can paste links or say “none”.";
      leads[from].step = 3;
    }

    // STEP 3
    else if (leads[from].step === 3) {
      leads[from].references = text;
      reply =
        "Do you have *brand colours or a logo*? (If not, just say no.)";
      leads[from].step = 4;
    }

    // STEP 4
    else if (leads[from].step === 4) {
      leads[from].branding = text;
      reply =
        "Last one 👍\n\nWhat’s the *main goal* of the website? (Bookings, sales, credibility, etc.)";
      leads[from].step = 5;
    }

    // STEP 5 — DONE
    else if (leads[from].step === 5) {
      leads[from].goal = text;

      console.log("NEW LEAD:", leads[from]);

      reply =
        "Perfect ✅ I’ve got everything I need.\n\nI’ll put together a website mockup and get back to you shortly.\n\n– WebNest Media";

      delete leads[from];
    }

    // SEND MESSAGE
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

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("WebNest bot running on port", PORT);
});
