// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/naive-fid-setter/NeynarUserScoresV1.sol";

contract NeynarUserScoresV1Test is Test {
    NeynarUserScoresV1 private scoresContract;
    address private admin = address(0x1);
    address private writer = address(0x2);

    function setUp() public {
        scoresContract = new NeynarUserScoresV1();
    }

    function testSetAndGetScore() public {
        vm.prank(writer);
        scoresContract.setScore(1, 100);

        uint24 score = scoresContract.getScore(1);
        assertEq(score, 100, "Score should be 100");
    }

    function testSetAndGetScores() public {
        uint256[] memory fids = new uint256[](2);
        fids[0] = 1;
        fids[1] = 2;

        NeynarUserScoresV1.SetScore[] memory scoresToAdd = new NeynarUserScoresV1.SetScore[](2);
        scoresToAdd[0] = NeynarUserScoresV1.SetScore(1, 100);
        scoresToAdd[1] = NeynarUserScoresV1.SetScore(2, 200);

        vm.prank(writer);
        scoresContract.setScores(scoresToAdd);

        uint24[] memory scores = scoresContract.getScores(fids);
        assertEq(scores[0], 100, "Score for fid 1 should be 100");
        assertEq(scores[1], 200, "Score for fid 2 should be 200");
    }

    function testDeleteScore() public {
        vm.prank(writer);
        scoresContract.setScore(1, 100);

        vm.prank(writer);
        scoresContract.deleteScore(1);

        uint24 score = scoresContract.getScore(1);
        assertEq(score, 0, "Score should be deleted");
    }

    function testUpdateScoresInBulk() public {
        NeynarUserScoresV1.SetScore[] memory scoresToAdd = new NeynarUserScoresV1.SetScore[](2);
        scoresToAdd[0] = NeynarUserScoresV1.SetScore(1, 100);
        scoresToAdd[1] = NeynarUserScoresV1.SetScore(2, 200);

        uint256[] memory fidsToDelete = new uint256[](1);
        fidsToDelete[0] = 1;

        vm.prank(writer);
        scoresContract.updateScoresInBulk(scoresToAdd, fidsToDelete);

        uint24 score1 = scoresContract.getScore(1);
        uint24 score2 = scoresContract.getScore(2);

        assertEq(score1, 0, "Score for fid 1 should be deleted");
        assertEq(score2, 200, "Score for fid 2 should be 200");
    }


    function testFuzzSetScores(uint256 count) public {
        vm.assume(count > 0 && count <= 1000); // Limit to a reasonable range for testing

        NeynarUserScoresV1.SetScore[] memory scoresToAdd = new NeynarUserScoresV1.SetScore[](count);
        for (uint256 i = 0; i < count; i++) {
            scoresToAdd[i] = NeynarUserScoresV1.SetScore(i, uint24(i + 1));
        }

        vm.prank(writer);
        scoresContract.setScores(scoresToAdd);

        for (uint256 i = 0; i < count; i++) {
            uint24 score = scoresContract.getScore(i);
            assertEq(score, uint24(i + 1), "Score should match the set value");
        }
    }
}
