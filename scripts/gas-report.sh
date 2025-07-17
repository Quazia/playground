#!/usr/bin/env bash
# 1) run tests & get L2 gasUsed
forge test \
  --fork-url arbitrum \
  --match-path test/MyContract.t.sol \
  --gas-report

# 2) build calldata and fetch L1 fee
CALDATA=$(cast calldata src/MyContract.sol:MyContract "doSomething(uint256)" 1234)
L1_FEE=$(cast call \
  --rpc-url $ARB_RPC_URL \
  0x000000000000000000000000000000000000006c \
  "getL1Fee(bytes)" \
  $CALDATA)

# 3) get L2 gas price & compute total
L2_GAS_PRICE=$(cast gas-price --rpc-url $ARB_RPC_URL)
GAS_USED=200123  # ← replace with the “gasUsed” from the Forge report
TOTAL=$((L2_GAS_PRICE * GAS_USED + L1_FEE))
echo "Total wallet cost: $(cast to-eth $TOTAL) ETH"
