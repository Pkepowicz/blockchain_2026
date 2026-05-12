// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/Market/PredictionMarket.sol";

contract ForceResolve is Script {
    function run() external {
        uint256 deployerPk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        address marketAddr = vm.envAddress("PREDICTION_MARKET_ADDRESS");

        PredictionMarket market = PredictionMarket(marketAddr);

        uint256 marketCount = market.nextMarketId();
        console.log("Current time:", block.timestamp);
        console.log("Markets to resolve:", marketCount);

        vm.startBroadcast(deployerPk);
        for (uint256 marketId = 0; marketId < marketCount; marketId++) {
            PredictionMarket.Market memory currentMarket = market.getMarket(marketId);
            console.log("Resolving market:", marketId);
            console.log("End time:", currentMarket.endTime);
            market.resolveMarket(marketId);

            PredictionMarket.Market memory resolved = market.getMarket(marketId);
            console.log("Resolved:", resolved.resolved);
            console.log("Yes wins:", resolved.yesWins ? "true" : "false");
            console.log("Yes pool:", resolved.totalYesPool);
            console.log("No pool:", resolved.totalNoPool);
        }
        vm.stopBroadcast();
    }
}
