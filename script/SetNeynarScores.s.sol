pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {NeynarUserScoresV1} from "../src/naive-fid-setter/NeynarUserScoresV1.sol";
import {console} from "forge-std/console.sol";

contract SetNeynarScoresScript is Script {
    function run() external {
        vm.startBroadcast();

        // deploy the contract instance
        NeynarUserScoresV1 scoresContract = new NeynarUserScoresV1();

        // load the previously serialized calldata from your test output
        string memory json = vm.readFile("test/maxPayload.json");
        console.log("JSON: ", json);
        bytes memory encoded = vm.parseJson(json, ".entry");
        console.logBytes(encoded);
        //emit log_named_bytes("Payload", payload);
        bytes  memory rawPayload = abi.decode(encoded, (bytes));

        console.log("rawPayload hex:");
        console.logBytes(rawPayload);

        // execute the exact calldata (cold)
        (bool ok, ) = address(scoresContract).call(rawPayload);
        require(ok, "cold call failed");

        // execute again to measure warm-call costs
        (bool ok2, ) = address(scoresContract).call(rawPayload);
        require(ok2, "warm call failed");

        vm.stopBroadcast();
    }
}
