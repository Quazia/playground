pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {NeynarUserScoresV1} from "../src/naive-fid-setter/NeynarUserScoresV1.sol";

contract SetNeynarScoresScript is Script {
    function run() external {
        vm.startBroadcast();

        // deploy the contract instance
        NeynarUserScoresV1 scoresContract = new NeynarUserScoresV1();

        // load the previously serialized calldata from your test output
        string memory json = vm.readFile("test/maxPayload.json");
        bytes memory payload = vm.parseJson(json, ".payload");

        // execute the exact calldata
        (bool ok, ) = address(scoresContract).call(payload);
        require(ok, "call failed");

        vm.stopBroadcast();
    }
}
