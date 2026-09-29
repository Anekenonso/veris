import fs from "fs";
import path from "path";
import solc from "solc";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ARC_RPC_URL = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";
const ARC_CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID || "5042002", 10);
// Use existing funded testnet deployer key or fallback to default funded Anvil key
const DEPLOYER_KEY =
  process.env.ARC_DEPLOYER_KEY ||
  process.env.PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  console.log("=============================================================");
  console.log("VERIS — ON-CHAIN DEPLOYMENT TO ARC TESTNET (Option 1)");
  console.log(`RPC URL:  ${ARC_RPC_URL}`);
  console.log(`Chain ID: ${ARC_CHAIN_ID}`);
  console.log("=============================================================\n");

  // 1. Compile Solidity contract
  console.log("1. Compiling contracts/ReputationRegistry.sol...");
  const contractPath = path.resolve("contracts", "ReputationRegistry.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "ReputationRegistry.sol": { content: source },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    let hasError = false;
    for (const err of output.errors) {
      console.log(`[${err.severity.toUpperCase()}] ${err.formattedMessage}`);
      if (err.severity === "error") hasError = true;
    }
    if (hasError) process.exit(1);
  }

  const compiled = output.contracts["ReputationRegistry.sol"]["ReputationRegistry"];
  const abi = compiled.abi;
  const bytecode = compiled.evm.bytecode.object;
  console.log("   ✅ Compilation complete.");

  // Save compiled artifact
  const artifactPath = path.resolve("contracts", "ReputationRegistry.json");
  fs.writeFileSync(artifactPath, JSON.stringify({ abi, bytecode }, null, 2), "utf8");
  console.log(`   Saved artifact to ${artifactPath}`);

  // 2. Connect to Arc Testnet
  console.log("\n2. Connecting to Arc Testnet...");
  const provider = new ethers.JsonRpcProvider(ARC_RPC_URL, ARC_CHAIN_ID);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`   Deployer Address: ${wallet.address}`);
  console.log(`   Deployer Balance: ${ethers.formatEther(balance)} USDC gas`);

  if (balance === 0n) {
    throw new Error(`Deployer address ${wallet.address} has 0 balance on Arc Testnet. Please fund it with testnet USDC gas.`);
  }

  // 3. Deploy Contract
  console.log("\n3. Deploying ReputationRegistry contract...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Deploy transaction
  const deployTx = await factory.deploy();
  console.log(`   Deployment Tx Hash: ${deployTx.deploymentTransaction().hash}`);
  console.log(`   ArcScan Tx URL:     https://testnet.arcscan.io/tx/${deployTx.deploymentTransaction().hash}`);
  console.log("   Waiting for confirmation on Arc Testnet...");

  await deployTx.waitForDeployment();
  const contractAddress = await deployTx.getAddress();
  console.log(`\n   🎉 Contract Deployed Successfully!`);
  console.log(`   Contract Address:   ${contractAddress}`);
  console.log(`   ArcScan Explorer:   https://testnet.arcscan.io/address/${contractAddress}`);

  // 4. Verify deployment via view call
  console.log("\n4. Verifying on-chain contract state...");
  const registryContract = new ethers.Contract(contractAddress, abi, provider);
  const owner = await registryContract.owner();
  const isAuthorized = await registryContract.authorizedAgents(wallet.address);
  console.log(`   Owner:              ${owner}`);
  console.log(`   Deployer Authorized:${isAuthorized}`);

  // 5. Update .env.local
  console.log("\n5. Updating .env.local configuration...");
  const envPath = path.resolve(".env.local");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const updateOrAppend = (key, val) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  };

  updateOrAppend("REPUTATION_REGISTRY_ADDRESS", contractAddress);
  updateOrAppend("ARC_RPC_URL", ARC_RPC_URL);
  updateOrAppend("ARC_CHAIN_ID", ARC_CHAIN_ID.toString());
  updateOrAppend("ARC_ORCHESTRATOR_KEY", DEPLOYER_KEY);

  fs.writeFileSync(envPath, envContent.trim() + "\n", "utf8");
  console.log("   ✅ .env.local successfully updated with live contract address!");

  console.log("\n=============================================================");
  console.log("DEPLOYMENT COMPLETE — READY TO WIRE LIVE ON-CHAIN RPC!");
  console.log("=============================================================\n");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
