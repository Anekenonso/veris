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
      if (val) {
        process.env[key.trim()] = val;
      }
    }
  }
}

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;

if (!apiKey) {
  console.log("STATUS: MISSING_KEY");
  console.log("DETAILS: OPENAI_API_KEY is not defined in .env.local");
  process.exit(1);
}

const clientConfig = { apiKey };
if (baseURL) {
  clientConfig.baseURL = baseURL;
}

const openai = new OpenAI(clientConfig);

async function testConnection() {
  console.log(`Testing OpenAI API connection (Base URL: ${baseURL || "https://api.openai.com/v1"})...`);
  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [{ role: "user", content: "Reply with the word 'READY' only." }],
      max_tokens: 10,
    });
    const reply = res.choices[0]?.message?.content?.trim();
    console.log(`STATUS: SUCCESS`);
    console.log(`Model Response: ${reply}`);
    console.log(`Model Used: ${res.model}`);
  } catch (err) {
    console.log(`STATUS: FAILED`);
    console.log(`Error Code: ${err.code || err.status || "N/A"}`);
    console.log(`Error Message: ${err.message}`);
    process.exit(1);
  }
}

testConnection();
