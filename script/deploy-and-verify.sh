#!/usr/bin/env bash
set -e

RPC_URL="https://base.drpc.org"
API_KEY="KWQ7H2N2HNPEX3JU7WWKGIIKGYWE1M118N"
CHAIN="base"
PRIVATE_KEY="0xb73637924863715d15237c92d8714493cd3f41bb1aaac9ca4e94f27b89caa3a0"

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
