pragma solidity ^0.8.26;
import "forge-std/Test.sol";
import "../src/naive-fid-setter/NeynarUserScoresV1.sol";
import "../src/compressed-fid-setter/NeynarUserScoresZip.sol";
import {LibZip} from "solady/utils/LibZip.sol";

interface IOptimismGasOracle {
    function getL1Fee(bytes memory data) external view returns (uint256);
    function getL1GasUsed(bytes memory data) external view returns (uint56);
}

contract BaseGasTest is Test {
    IOptimismGasOracle constant BASE_GAS =
        IOptimismGasOracle(0x420000000000000000000000000000000000000F);
    NeynarUserScoresV1 cV1;
    NeynarUserScoresZip cZip;

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_RPC_URL"));
        cV1 = new NeynarUserScoresV1();
        cZip = new NeynarUserScoresZip(); 
    }

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
            cV1.setScores.selector,
            scoresToAdd
        );
        uint256 l1Fee = BASE_GAS.getL1Fee(payload);
        uint56 l1GasUsed = BASE_GAS.getL1GasUsed(payload);
        emit log_named_uint("Total Scores", count);
        emit log_named_uint("L1 fee (wei)", l1Fee);
        emit log_named_uint("L1 gas used", l1GasUsed);
        uint256 gasBefore = gasleft();
        cV1.setScores(scoresToAdd);
        uint256 l2GasUsed = gasBefore - gasleft();
        emit log_named_uint("L2 gas used", l2GasUsed);
        assertLt(l2GasUsed, block.gaslimit);

    }

    /// @notice Compare L1/L2 gas for FLZ-compressed batch setter
    function testSetScoreGasFuzz_FLZ(uint256 totalScores) public {
        uint256 count = bound(totalScores, 1, 2800);
        NeynarUserScoresZip.SetScore[] memory scoresToAdd =
            new NeynarUserScoresZip.SetScore[](count);

        for (uint256 i = 0; i < count; i++) {
            uint232 fid = uint232(bound(
                uint256(keccak256(abi.encodePacked(totalScores, i))),
                0,
                1_000_000
            ));
            uint24 scoreVal = uint24(
                bound(
                    uint256(keccak256(abi.encodePacked(totalScores, i, fid))),
                    1,
                    1000
                )
            );
            scoresToAdd[i] = NeynarUserScoresZip.SetScore(fid, scoreVal);
        }

        bytes memory raw = abi.encode(scoresToAdd);
        bytes memory compressed = LibZip.flzCompress(raw);
        bytes memory payload =
            abi.encodeWithSelector(cZip.setScoresFLZ.selector, compressed);

        uint256 l1Fee = BASE_GAS.getL1Fee(payload);
        uint56 l1GasUsed = BASE_GAS.getL1GasUsed(payload);
        emit log_named_uint("FLZ Total Scores", count);
        emit log_named_uint("FLZ L1 fee (wei)", l1Fee);
        emit log_named_uint("FLZ L1 gas used", l1GasUsed);

        uint256 gasBefore = gasleft();
        cZip.setScoresFLZ(compressed);
        uint256 l2GasUsed = gasBefore - gasleft();
        emit log_named_uint("FLZ L2 gas used", l2GasUsed);
        assertLt(l2GasUsed, block.gaslimit);
    }

    /// @notice Compare L1/L2 gas for CD-compressed batch setter
    function testSetScoreGasFuzz_CD(uint256 totalScores) public {
        uint256 count = bound(totalScores, 1, 2800);
        NeynarUserScoresZip.SetScore[] memory scoresToAdd =
            new NeynarUserScoresZip.SetScore[](count);

        for (uint256 i = 0; i < count; i++) {
            uint232 fid = uint232(bound(
                uint256(keccak256(abi.encodePacked(totalScores, i))),
                0,
                1_000_000
            ));
            uint24 scoreVal = uint24(
                bound(
                    uint256(keccak256(abi.encodePacked(totalScores, i, fid))),
                    1,
                    1000
                )
            );
            scoresToAdd[i] = NeynarUserScoresZip.SetScore(fid, scoreVal);
        }

        bytes memory raw = abi.encode(scoresToAdd);
        bytes memory compressed = LibZip.cdCompress(raw);
        bytes memory payload =
            abi.encodeWithSelector(cZip.setScoresCD.selector, compressed);

        uint256 l1Fee = BASE_GAS.getL1Fee(payload);
        uint56 l1GasUsed = BASE_GAS.getL1GasUsed(payload);
        emit log_named_uint("CD Total Scores", count);
        emit log_named_uint("CD L1 fee (wei)", l1Fee);
        emit log_named_uint("CD L1 gas used", l1GasUsed);

        uint256 gasBefore = gasleft();
        cZip.setScoresCD(compressed);
        uint256 l2GasUsed = gasBefore - gasleft();
        emit log_named_uint("CD L2 gas used", l2GasUsed);
        assertLt(l2GasUsed, block.gaslimit);
    }

    function testMaxScoresUntilGasError() public {
        uint256 count = 2000; // This is crashing out inconsistently
        // We get to around 2627 on Sepolia before it OOGs
        // On base we get closer to 5647
        NeynarUserScoresV1.SetScore[] memory scores;
        bytes memory workingPayload;
        // while (true) {
        //     count++;
            // build a batch of `count` trivial scores - triviality will effects the compressed tests but not these ones
            scores = new NeynarUserScoresV1.SetScore[](count);
            for (uint256 i = 0; i < count; i++) {
                scores[i] = NeynarUserScoresV1.SetScore({ fid: i, score: 1 });
            }

            // encode calldata
            bytes memory payload = abi.encodeWithSelector(cV1.setScores.selector, scores);
            emit log_named_uint("Total Scores", count);

            vm.startSnapshotGas("testMaxScoresUntilGasError");
            // low‐level call so we can catch OOG/revert
            (bool ok, ) = address(cV1).call(payload);
            uint256 l2GasUsed = vm.stopSnapshotGas();
            emit log_named_uint("L2 gas used", l2GasUsed);

            uint256 l1Fee = BASE_GAS.getL1Fee(payload);
            uint56 l1GasUsed = BASE_GAS.getL1GasUsed(payload);
            emit log_named_uint("L1 fee (wei)", l1Fee);
            emit log_named_uint("L1 gas used", l1GasUsed);
            
            // I absolutely hate that these are different
            uint256 MAX_L2_GAS_BASE = 130_000_000;
            uint256 MAX_L2_GAS_BASE_SEPOLIA = 60_000_000;
            // save the last non-reverting calldata to JSON for off-chain use
            vm.writeJson(vm.serializeBytes(".payload", "entry", payload), "./test/maxPayload.json");
            // report the largest batch that did not revert
            emit log_named_uint("Max batch size before revert", count - 1);
        // }
    }

    /// @notice non-fuzz max-batch gas test for FLZ-compressed setter
    function testMaxScoresUntilGasError_FLZ() public {
        uint256 count = 2000;
        NeynarUserScoresZip.SetScore[] memory scores = new NeynarUserScoresZip.SetScore[](count);
        for (uint256 i = 0; i < count; ++i) {
            scores[i] = NeynarUserScoresZip.SetScore({ fid: uint232(i), score: 1 });
        }
        bytes memory raw = abi.encode(scores);
        bytes memory compressed = LibZip.flzCompress(raw);
        bytes memory payload = abi.encodeWithSelector(cZip.setScoresFLZ.selector, compressed);

        emit log_named_uint("FLZ Total Scores", count);
        vm.startSnapshotGas("testMaxScoresUntilGasError_FLZ");
        (bool ok, ) = address(cZip).call(payload);
        uint256 l2GasUsed = vm.stopSnapshotGas();
        emit log_named_uint("FLZ L2 gas used", l2GasUsed);

        uint256 l1Fee = BASE_GAS.getL1Fee(payload);
        uint56 l1GasUsed = BASE_GAS.getL1GasUsed(payload);
        emit log_named_uint("FLZ L1 fee (wei)", l1Fee);
        emit log_named_uint("FLZ L1 gas used", l1GasUsed);

        vm.writeJson(vm.serializeBytes(".payload", "entry", payload), "./test/maxPayload_FLZ.json");
        emit log_named_uint("FLZ Max batch size before revert", count - 1);
    }

    /// @notice non-fuzz max-batch gas test for CD-compressed setter
    function testMaxScoresUntilGasError_CD() public {
        uint256 count = 2000;
        NeynarUserScoresZip.SetScore[] memory scores = new NeynarUserScoresZip.SetScore[](count);
        for (uint256 i = 0; i < count; ++i) {
            scores[i] = NeynarUserScoresZip.SetScore({ fid: uint232(i), score: 1 });
        }
        bytes memory raw = abi.encode(scores);
        bytes memory compressed = LibZip.cdCompress(raw);
        bytes memory payload = abi.encodeWithSelector(cZip.setScoresCD.selector, compressed);

        emit log_named_uint("CD Total Scores", count);
        vm.startSnapshotGas("testMaxScoresUntilGasError_CD");
        (bool ok, ) = address(cZip).call(payload);
        uint256 l2GasUsed = vm.stopSnapshotGas();
        emit log_named_uint("CD L2 gas used", l2GasUsed);

        uint256 l1Fee = BASE_GAS.getL1Fee(payload);
        uint56 l1GasUsed = BASE_GAS.getL1GasUsed(payload);
        emit log_named_uint("CD L1 fee (wei)", l1Fee);
        emit log_named_uint("CD L1 gas used", l1GasUsed);

        vm.writeJson(vm.serializeBytes(".payload", "entry", payload), "./test/maxPayload_CD.json");
        emit log_named_uint("CD Max batch size before revert", count - 1);
    }

    /// @notice Build a single max‐batch, generate V1, FLZ and CD payloads, and save each to JSON
    function testSaveCombinedMaxPayloads() public {
        uint256 count = 2000;
        // Build identical batch for all three
        NeynarUserScoresV1.SetScore[] memory scores =
            new NeynarUserScoresV1.SetScore[](count);
        for (uint256 i = 0; i < count; i++) {
            scores[i] = NeynarUserScoresV1.SetScore({ fid: i, score: 1 });
        }

        // V1 (naive) payload
        bytes memory payloadV1 =
            abi.encodeWithSelector(cV1.setScores.selector, scores);
        vm.writeJson(
            vm.serializeBytes(".payload", "entry", payloadV1),
            "./test/maxCombinedPayload_V1.json"
        );

        // FLZ‐compressed payload
        bytes memory raw = abi.encode(scores);
        bytes memory compressedFLZ = LibZip.flzCompress(raw);
        bytes memory payloadFLZ =
            abi.encodeWithSelector(cZip.setScoresFLZ.selector, compressedFLZ);
        vm.writeJson(
            vm.serializeBytes(".payload", "entry", payloadFLZ),
            "./test/maxCombinedPayload_FLZ.json"
        );

        // CD‐compressed payload
        bytes memory compressedCD = LibZip.cdCompress(raw);
        bytes memory payloadCD =
            abi.encodeWithSelector(cZip.setScoresCD.selector, compressedCD);
        vm.writeJson(
            vm.serializeBytes(".payload", "entry", payloadCD),
            "./test/maxCombinedPayload_CD.json"
        );
    }
}
