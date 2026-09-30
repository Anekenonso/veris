/**
 * Circle Developer-Controlled Wallets Setup & Diagnostic Tool
 * Follows official Circle Developer SDK guidelines for Entity Secret generation,
 * registration with Circle Web3 Services, and wallet setup.
 */

import { config } from "dotenv";
import {
  generateEntitySecret,
  registerEntitySecretCiphertext,
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";
import fs from "fs";
import path from "path";

config({ path: [".env.local"] });

const command = process.argv[2] || "status";

async function main() {
  console.log("=================================================");
  console.log("  VERIS — CIRCLE DEVELOPER WALLETS ASSISTANT");
  console.log("=================================================\n");

  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  const agentWalletId = process.env.NEXT_PUBLIC_AGENT_WALLET_ID?.trim();
  const agentWalletAddress = process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS?.trim();

  if (command === "generate-secret") {
    console.log("Generating a fresh 32-byte (64-character hex) Entity Secret...");
    import("crypto").then((crypto) => {
      const newSecret = crypto.randomBytes(32).toString("hex");
      console.log("\n========================================================");
      console.log(`ENTITY SECRET: ${newSecret}`);
      console.log("========================================================");

      const envPath = path.resolve(".env.local");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (envContent.includes("CIRCLE_ENTITY_SECRET=")) {
          envContent = envContent.replace(
            /^CIRCLE_ENTITY_SECRET=.*$/m,
            `CIRCLE_ENTITY_SECRET=${newSecret}`
          );
          fs.writeFileSync(envPath, envContent, "utf-8");
          console.log("\n✅ Automatically saved CIRCLE_ENTITY_SECRET to .env.local!");
        }
      }

      console.log("\nNext Steps:");
      console.log("1. Add your CIRCLE_API_KEY from https://console.circle.com/apikeys into .env.local");
      console.log("2. Run: npm run circle:register");
      console.log("3. Run: npm run generate-wallet");
    });
    return;
  }

  if (command === "register") {
    if (!apiKey) {
      console.error("❌ Error: CIRCLE_API_KEY is not defined in .env.local.");
      console.error("   Obtain one at https://console.circle.com/apikeys and add it to .env.local.");
      process.exit(1);
    }

    let cleanedKey = apiKey.trim().replace(/^['"]|['"]$/g, "");
    let parts = cleanedKey.split(":");

    // If 2 parts without TEST_API_KEY prefix, auto-prepend TEST_API_KEY:
    if (parts.length === 2 && !parts[0].includes("API_KEY")) {
      console.log("ℹ️ Detected missing 'TEST_API_KEY:' prefix. Prepending 'TEST_API_KEY:'...");
      cleanedKey = `TEST_API_KEY:${cleanedKey}`;
      parts = cleanedKey.split(":");
      const envPath = path.resolve(".env.local");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        envContent = envContent.replace(/^CIRCLE_API_KEY=.*$/m, `CIRCLE_API_KEY=${cleanedKey}`);
        fs.writeFileSync(envPath, envContent, "utf-8");
        console.log("✅ Auto-corrected CIRCLE_API_KEY in .env.local to include TEST_API_KEY prefix!\n");
      }
    }

    if (parts.length !== 3) {
      console.error("❌ Invalid CIRCLE_API_KEY format!");
      console.error(`   Found ${parts.length} part(s) separated by colons (:), but Circle API keys require exactly 3 parts:`);
      console.error("   Format: ENVIRONMENT:KEY_ID:SECRET");
      console.error("   Example: TEST_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d\n");
      console.error("   Common Causes:");
      console.error("   1. If your key has 2 parts starting with TEST_API_KEY, the final secret was truncated when copied.");
      console.error("   2. You copied the Key ID or Name instead of the full key.");
      console.error("   👉 Please copy the ENTIRE API key string from https://console.circle.com/api-keys\n");
      process.exit(1);
    }

    if (!entitySecret) {
      console.error("❌ Error: CIRCLE_ENTITY_SECRET is not defined in .env.local.");
      console.error("   Run: npm run circle:generate-secret");
      process.exit(1);
    }

    console.log("Registering Entity Secret Ciphertext with Circle API...");
    try {
      const response = await registerEntitySecretCiphertext({
        apiKey: cleanedKey,
        entitySecret,
      });

      console.log("✅ Entity Secret successfully registered with Circle!");
      if (response?.data?.recoveryFile) {
        console.log("📁 Recovery file generated and saved.");
      }
      console.log("\nYou can now generate your Arc Testnet Agent Wallet by running:");
      console.log("   node generate-wallet.mjs");
    } catch (err) {
      console.error("❌ Registration failed:", err?.message || err);
      if (err?.response?.data) {
        console.error("   Circle API Response:", JSON.stringify(err.response.data, null, 2));
      }
      process.exit(1);
    }
    return;
  }

  if (command === "check" || command === "status") {
    console.log("Configuration Status in .env.local:");
    console.log(`- CIRCLE_API_KEY:            ${apiKey ? "Configured (" + apiKey.substring(0, 8) + "...)" : "MISSING"}`);
    console.log(`- CIRCLE_ENTITY_SECRET:     ${entitySecret ? "Configured (32 bytes)" : "MISSING"}`);
    console.log(`- AGENT_WALLET_ID:          ${agentWalletId || "Not generated yet"}`);
    console.log(`- AGENT_WALLET_ADDRESS:     ${agentWalletAddress || "Not generated yet"}`);

    if (!apiKey || !entitySecret) {
      console.log("\n⚠️ Circle credentials are not yet configured in .env.local.");
      console.log("To setup Circle Developer-Controlled Wallets:");
      console.log("  1. Get API Key from: https://console.circle.com/apikeys");
      console.log("  2. Run: node scripts/setup-circle.mjs generate-secret");
      console.log("  3. Save both to .env.local");
      console.log("  4. Run: node scripts/setup-circle.mjs register");
      console.log("  5. Run: node generate-wallet.mjs");
      return;
    }

    console.log("\nTesting Circle API connectivity...");
    try {
      const client = initiateDeveloperControlledWalletsClient({
        apiKey,
        entitySecret,
      });

      const walletSets = await client.listWalletSets();
      console.log("✅ Successfully connected to Circle Developer-Controlled Wallets API!");
      console.log(`   Found ${walletSets.data?.walletSets?.length || 0} wallet set(s).`);

      if (!agentWalletAddress) {
        console.log("\nℹ️ Agent wallet not yet generated. Run:");
        console.log("   node generate-wallet.mjs");
      } else {
        console.log(`   Active Agent Wallet: ${agentWalletAddress}`);
      }
    } catch (err) {
      console.error("❌ Failed to query Circle API:", err?.message || err);
      if (err?.response?.data) {
        console.error("   Details:", JSON.stringify(err.response.data, null, 2));
      }
    }
  }
}

main().catch(console.error);
