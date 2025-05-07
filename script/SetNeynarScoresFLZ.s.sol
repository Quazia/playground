pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {NeynarUserScoresZip} from "../src/compressed-fid-setter/NeynarUserScoresZip.sol";

contract SetNeynarScoresFLZScript is Script {
    function run() external {
        vm.startBroadcast();

        // deploy compressed‐setter contract
        NeynarUserScoresZip c = new NeynarUserScoresZip();

        // read saved FLZ payload
        string memory json = vm.readFile("test/maxPayload_FLZ.json");
        bytes memory entry = vm.parseJson(json, ".entry");
        bytes memory payload = abi.decode(entry, (bytes));

        console.log("FLZ payload length:", payload.length);

        // cold call
        (bool ok, ) = address(c).call(payload);
        require(ok, "cold FLZ call failed");

        // warm call
        (ok, ) = address(c).call(payload);
        require(ok, "warm FLZ call failed");

        vm.stopBroadcast();
    }
}
