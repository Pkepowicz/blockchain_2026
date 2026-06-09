// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Token/BettingToken.sol";
import "../src/mocks/MockV3Aggregator.sol";
import "../src/Market/PredictionMarket.sol";

contract DeployAnvil is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        BettingToken token = new BettingToken();
        MockV3Aggregator aggregator = new MockV3Aggregator(18, 50_000e18);
        PredictionMarket market = new PredictionMarket(address(token));

        token.mint();
        token.approve(address(market), type(uint256).max);

        // Seed a few markets so the UI is ready immediately after deploy.
        market.createMarket(address(aggregator), 45_000e18, 5 minutes);
        market.createMarket(address(aggregator), 52_000e18, 10 minutes);
        market.createMarket(address(aggregator), 50_500e18, 15 minutes);

        vm.stopBroadcast();

        string memory header = "=== Deployment Summary ===";
        console.log(header);
        console.log("BettingToken:", address(token));
        console.log("MockV3Aggregator:", address(aggregator));
        console.log("PredictionMarket:", address(market));
        console.log("Seeded markets:");
        console.log("  #0: strike 45,000 | end 5 min");
        console.log("  #1: strike 52,000 | end 10 min");
        console.log("  #2: strike 50,500 | end 15 min");
    }
}
