pragma solidity ^0.8.26;
import "forge-std/Test.sol";
import "../src/naive-fid-setter/NeynarUserScoresV1.sol";

interface IOptimismGasOracle {
    function getL1Fee(bytes memory data) external view returns (uint256);
    function getL1GasUsed(bytes memory data) external view returns (uint56);
}

contract BaseGasTest is Test {
    IOptimismGasOracle constant BASE_GAS =
        IOptimismGasOracle(0x420000000000000000000000000000000000000F);
    NeynarUserScoresV1 c;

    function setUp() public {
        // select an Arbitrum fork using your ARB_RPC_URL env var
        vm.createSelectFork(vm.envString("BASE_RPC_URL"));

        // now the precompile at 0x...006C exists
        c = new NeynarUserScoresV1();
    }

    // function testSetScoreGas() public {
    //     // load and parse JSON file
    //     string memory json = vm.readFile("./test/scores.json");
    //     bytes memory raw = vm.parseJson(json, ".scores");
    //     NeynarUserScoresV1.SetScore[] memory scoresToAdd =
    //         abi.decode(raw, (NeynarUserScoresV1.SetScore[]));

    //     bytes memory payload = abi.encodeWithSelector(
    //         c.setScores.selector,
    //         scoresToAdd
    //     );

    //     uint256 l1Fee = BASE_GAS.getL1Fee(payload);
    //     uint56 l1GasUsed = BASE_GAS.getL1GasUsed(payload);

    //     emit log_named_uint("L1 fee (wei)", l1Fee);
    //     emit log_named_uint("L1 gas used", l1GasUsed);
    //     // Forge will print L2 gasUsed when run with --gas-report
    // }

    function testSetScoreGasFuzz(uint256 totalScores) public {
        // bound number of entries between 1 and 1000
        uint256 count = bound(totalScores, 1, 2800);

        // build array of random scores
        NeynarUserScoresV1.SetScore[] memory scoresToAdd =
            new NeynarUserScoresV1.SetScore[](count);

        for (uint256 i = 0; i < count; i++) {
            // random fid in [0, 1_000_000]
            uint256 fid = bound(
                uint256(keccak256(abi.encodePacked(totalScores, i))),
                0,
                1_000_000
            );
            // random score in [1, 1000]
            uint24 scoreVal = uint24(bound(
                uint256(keccak256(abi.encodePacked(totalScores, i, fid))),
                1,
                1000
            ));
            scoresToAdd[i] = NeynarUserScoresV1.SetScore(fid, scoreVal);
        }

        // batch‐encode and measure L1 fee
        bytes memory payload = abi.encodeWithSelector(
            c.setScores.selector,
            scoresToAdd
        );
        uint256 l1Fee = BASE_GAS.getL1Fee(payload);
        uint56 l1GasUsed = BASE_GAS.getL1GasUsed(payload);
        emit log_named_uint("Total Scores", count);
        emit log_named_uint("L1 fee (wei)", l1Fee);
        emit log_named_uint("L1 gas used", l1GasUsed);
        uint256 gasBefore = gasleft();
        c.setScores(scoresToAdd);
        uint256 l2GasUsed = gasBefore - gasleft();
        emit log_named_uint("L2 gas used", l2GasUsed);
        assertLt(l2GasUsed, block.gaslimit);

    }

    function testMaxScoresUntilGasError() public {
        uint256 count = 2800; // Expectation is generally that this crashed out around 2830
        NeynarUserScoresV1.SetScore[] memory scores;

        while (true) {
            count++;
            // build a batch of `count` trivial scores - triviality will effects the compressed tests but not these ones
            scores = new NeynarUserScoresV1.SetScore[](count);
            for (uint256 i = 0; i < count; i++) {
                scores[i] = NeynarUserScoresV1.SetScore({ fid: i, score: 1 });
            }
            uint256 gasBefore = gasleft();

            // encode calldata
            bytes memory payload = abi.encodeWithSelector(c.setScores.selector, scores);

            // low‐level call so we can catch OOG/revert
            (bool ok, ) = address(c).call(payload);
            uint256 l2GasUsed = gasBefore - gasleft();
            emit log_named_uint("L2 gas used", l2GasUsed);
            assertLt(l2GasUsed, 130_000_000); // 130M is the max gas limit for L2

            if (!ok) {
                // save the last non-reverting calldata to JSON for off-chain use
                vm.serializeBytes(".payload", "entry", payload);
                vm.writeJson("test/maxPayload.json", ".");
                // report the largest batch that did not revert
                emit log_named_uint("Max batch size before revert", count - 1);
                break;
            }
        }
    }
}
