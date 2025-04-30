// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "solady/utils/MerkleProofLib.sol";
import {console} from "forge-std/console.sol";


contract MerkleProofGasTest is Test {
    bytes32 public root;
    bytes32[] public proof;

    function setUp() public {
        // Verify that path 'foo/files/bar.txt' exists
        string memory validPath = "./tree.json";
        assertTrue(vm.exists(validPath));
        // Read the tree.json file from the project root.
        string memory json = vm.readFile("./tree.json");

        // Parse the JSON to extract the Merkle root and proof.
        root = abi.decode(vm.parseJson(json, ".tree[0]"), (bytes32));

        // Extract the proof elements (remaining tree nodes after the root).
        bytes32[] memory tree = abi.decode(vm.parseJson(json, ".tree"), (bytes32[]));
        console.log("tree length: ", tree.length);
        console.logBytes32(root);
        console.logBytes32(tree[0]);  
        for (uint256 i = 0; i < tree.length; i++) {
            proof.push(tree[i]);
        }
    }

    function testGas_VerifyMerkleProof() public {
        // Use one of the values from the JSON as the leaf.
        bytes32 leaf = keccak256(abi.encodePacked(
            address(0x1111111111111111111111111111111111111111),
            uint256(5000000000000000000)
        ));

        // Verify the Merkle proof.
        bool isValid = MerkleProofLib.verify(proof, root, leaf);
        assertTrue(isValid);
    }
}