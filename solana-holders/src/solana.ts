// src/solana.ts
import { Connection, clusterApiUrl } from '@solana/web3.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const RPC_ENDPOINT =
  process.env.SOLANA_RPC_URL ?? clusterApiUrl('mainnet-beta');

export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

console.log(`🔗 Using Solana RPC: ${RPC_ENDPOINT}`);
