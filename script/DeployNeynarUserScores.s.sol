// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {NeynarUserScoresV1} from "../src/naive-fid-setter/NeynarUserScoresV1.sol";

contract NeynarUserScoresScript is Script {
    NeynarUserScoresV1 public scoresContract;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        scoresContract = new NeynarUserScoresV1();

        vm.stopBroadcast();
    }
}
