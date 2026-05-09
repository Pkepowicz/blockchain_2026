// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Token/BettingToken.sol";
import "../src/Market/PredictionMarket.sol";

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startPrank(deployer);

        BettingToken token = new BettingToken();

        address chainlinkAggregator = vm.envAddress("CHAINLINK_AGGREGATOR");
        int256 strikePrice = int256(vm.envUint("STRIKE_PRICE"));
        uint256 duration = vm.envUint("MARKET_DURATION");

        PredictionMarket market = new PredictionMarket(address(token));
        market.createMarket(chainlinkAggregator, strikePrice, duration);

        vm.stopPrank();

        string memory header = "=== Sepolia Deployment ===";
        console.log(header);
        console.log("BettingToken:", address(token));
        console.log("PredictionMarket:", address(market));
        console.log("ChainlinkAggregator:", chainlinkAggregator);
    }
}
