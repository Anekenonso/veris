import "dotenv/config";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...values] = trimmed.split("=");
      const val = values.join("=").trim().replace(/^['"]|['"]$/g, "");
      if (val) process.env[key.trim()] = val;
    }
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1",
});

async function list() {
  try {
    const res = await openai.models.list();
    console.log("ALL MODELS ON GROQ:");
    for (const m of res.data) {
      console.log(m.id);
    }
  } catch (e) {
    console.error("List failed:", e.message);
  }
}

list();
