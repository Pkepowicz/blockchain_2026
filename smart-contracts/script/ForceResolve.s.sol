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

        PredictionMarket.Market memory m = market.getMarket(0);
        uint256 endTime = m.endTime;
        console.log("Market 0 end time:", endTime);
        console.log("Current time:", block.timestamp);

        vm.startBroadcast(deployerPk);
        market.resolveMarket(0);
        vm.stopBroadcast();

        PredictionMarket.Market memory resolved = market.getMarket(0);
        console.log("Resolved:", resolved.resolved);
        console.log("Yes wins:", resolved.yesWins ? "true" : "false");
        console.log("Yes pool:", resolved.totalYesPool);
        console.log("No pool:", resolved.totalNoPool);
    }
}
