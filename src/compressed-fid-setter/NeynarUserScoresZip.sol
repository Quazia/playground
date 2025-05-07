pragma solidity ^0.8.26;

import {LibZip} from "solady/utils/LibZip.sol";

contract NeynarUserScoresZip {
    // We could further collapse this to a single uint256, but it would be less readable
    // and would require more complex encoding/decoding.
    // It's worth exploring if we need to save more gas but this will get us started.
    struct SetScore {
        uint232 fid; 
        uint24  score;
    }

    mapping(uint232 => uint24) private scores;

    /// @notice Lookup a single fid by scanning the decompressed list
    function getScore(uint256 fid) public view returns (uint24) {
        return scores[uint232(fid)];
    }

    /// @notice batch‐set scores from a compressed SetScore[] payload
    function setScoresFLZ(bytes calldata compressedScoresToAdd) public {
        // decompress and decode into SetScore[]
        bytes memory data = LibZip.flzDecompress(compressedScoresToAdd);
        SetScore[] memory toAdd = abi.decode(data, (SetScore[]));

        // set scores
        uint256 len = toAdd.length;
        for (uint256 i = 0; i < len; ++i) {
            scores[toAdd[i].fid] = toAdd[i].score;
        }
    }

    /// @notice batch‐set scores from a compressed SetScore[] payload
    function setScoresCD(bytes calldata compressedScoresToAdd) public {
        // decompress and decode into SetScore[]
        bytes memory data = LibZip.cdDecompress(compressedScoresToAdd);
        SetScore[] memory toAdd = abi.decode(data, (SetScore[]));

        // set scores
        uint256 len = toAdd.length;
        for (uint256 i = 0; i < len; ++i) {
            scores[toAdd[i].fid] = toAdd[i].score;
        }
    }
}
