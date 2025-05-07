pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {NeynarUserScoresZip} from "../src/compressed-fid-setter/NeynarUserScoresZip.sol";

contract SetNeynarScoresCDScript is Script {
    function run() external {
        vm.startBroadcast();

        // deploy compressed‐setter contract
        NeynarUserScoresZip c = new NeynarUserScoresZip();

        // read saved CD payload
        string memory json = vm.readFile("test/maxPayload_CD.json");
        bytes memory entry = vm.parseJson(json, ".entry");
        bytes memory payload = abi.decode(entry, (bytes));

        console.log("CD payload length:", payload.length);

        // cold call
        (bool ok, ) = address(c).call(payload);
        require(ok, "cold CD call failed");

        // warm call
        (ok, ) = address(c).call(payload);
        require(ok, "warm CD call failed");

        vm.stopBroadcast();
    }
}
