// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Token/BettingToken.sol";
import "../src/mocks/MockV3Aggregator.sol";
import "../src/Market/PredictionMarket.sol";

contract DeployAnvilNoIR is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        BettingToken token = new BettingToken();
        MockV3Aggregator aggregator = new MockV3Aggregator(18, 50_000e18);
        PredictionMarket market = new PredictionMarket(address(token));

        token.mint();
        token.approve(address(market), type(uint256).max);

        market.createMarket(address(aggregator), 45_000e18, 5 minutes);

        vm.stopBroadcast();
    }
}
