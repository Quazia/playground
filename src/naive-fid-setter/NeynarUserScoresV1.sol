// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title NeynarUserScoresV1
 * @notice Neynar's Farcaster User Scores posted on-chain.
 * @dev [Docs](https://docs.neynar.com/docs/verifications-contract)
 */
contract NeynarUserScoresV1 {
    struct SetScore {
        uint256 fid;
        uint24 score;
    }

    mapping(uint256 fid => uint24 score) private scores;

    event GetScore(uint256 indexed fid, uint24 score);


    /*
     * Public Getters from fid
     */

    function getScore(uint256 fid) public view returns (uint24 score) {
        score = scores[fid];
    }

    function getScoreWithEvent(uint256 fid) public returns (uint24 score) {
        score = scores[fid];

        emit GetScore(fid, score);
    }

    function getScores(uint256[] calldata fids) public view returns (uint24[] memory x) {
        uint256 length = fids.length;

        x = new uint24[](length);

        for (uint256 i = 0; i < length; i++) {
            x[i] = scores[fids[i]];
        }
    }

    /*
     * WRITER_ROLE-only Setters
     */

    function setScore(uint256 fid, uint24 score) public {
        scores[fid] = score;
    }

    function setScores(SetScore[] calldata scoresToAdd) public {
        uint256 length = scoresToAdd.length;
        for (uint256 i = 0; i < length; i++) {
            // TODO: gas golf this
            scores[scoresToAdd[i].fid] = scoresToAdd[i].score;
        }
    }

    function deleteScore(uint256 fid) public {
        delete scores[fid];
    }

    function deleteScores(uint256[] calldata fidsToDelete) public {
        uint256 length = fidsToDelete.length;
        for (uint256 i = 0; i < length; i++) {
            delete scores[fidsToDelete[i]];
        }
    }

    function updateScoresInBulk(
        SetScore[] calldata scoresToAdd,
        uint256[] calldata fidsToDelete
    ) public {
        setScores(scoresToAdd);
        deleteScores(fidsToDelete);
    }

}