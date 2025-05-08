#!/usr/bin/env bash
set -e

RPC_URL="https://base.drpc.org"
CHAIN="base"

# V1 (naive setter)
forge script script/SetNeynarScores.s.sol:SetNeynarScoresScript \
  --rpc-url "$RPC_URL" --broadcast --verify --etherscan-api-key "$API_KEY" \
  --chain "$CHAIN" --private-key "$PRIVATE_KEY"

# FLZ-compressed setter
forge script script/SetNeynarScoresFLZ.s.sol:SetNeynarScoresFLZScript \
  --rpc-url "$RPC_URL" --broadcast --verify --etherscan-api-key "$API_KEY" \
  --chain "$CHAIN" --private-key "$PRIVATE_KEY"

# CD-compressed setter
forge script script/SetNeynarScoresCD.s.sol:SetNeynarScoresCDScript \
  --rpc-url "$RPC_URL" --broadcast --verify --etherscan-api-key "$API_KEY" \
  --chain "$CHAIN" --private-key "$PRIVATE_KEY"
