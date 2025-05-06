pragma solidity ^0.8.26;
import "forge-std/Test.sol";
import "../src/naive-fid-setter/NeynarUserScoresV1.sol";

interface IArbGasOracle {
    function getL1Fee(bytes calldata) external view returns (uint256);
}

contract ArbGasWithL1Test is Test {
    IArbGasOracle constant ARB_GAS =
        IArbGasOracle(0x000000000000000000000000000000000000006C);
    NeynarUserScoresV1 c;

    // function setUp() public {
    //     // select an Arbitrum fork using your ARB_RPC_URL env var
    //     vm.createSelectFork(vm.envString("ARB_RPC_URL"));

    //     // now the precompile at 0x...006C exists
    //     c = new NeynarUserScoresV1();
    // }

    // function testSetScoreGas() public {
    //     bytes memory payload = abi.encodeWithSelector(
    //         c.setScore.selector, uint256(1), uint24(100)
    //     );
    //     uint256 l1Fee = ARB_GAS.getL1Fee(payload);
    //     emit log_named_uint("L1 fee (wei)", l1Fee);
    //     // Forge will print L2 gasUsed when run with --gas-report
    // }
}
