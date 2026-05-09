// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/Token/BettingToken.sol";
import "../src/Market/PredictionMarket.sol";

contract SeedPool is Script {
    function run() external {
        // Correct Anvil Account #1 Private Key
        // Resolves to: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
        uint256 seedAccountPk = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;

        address tokenAddr = vm.envAddress("BETTING_TOKEN_ADDRESS");
        address marketAddr = vm.envAddress("PREDICTION_MARKET_ADDRESS");

        BettingToken token = BettingToken(tokenAddr);
        PredictionMarket market = PredictionMarket(marketAddr);

        uint256 betAmount = 100e18;

        vm.startBroadcast(seedAccountPk);

        // Mint tokens to seed account
        token.mint();
        uint256 testBalance = token.balanceOf(vm.addr(seedAccountPk));
        console.log("Seed account token balance after mint:", testBalance);

        // Approve market to spend tokens
        token.approve(marketAddr, betAmount);

        // Place bet on NO outcome (marketId, isYes, amount)
        market.placeBet(0, false, betAmount);

        vm.stopBroadcast();

        // Show pool totals
        PredictionMarket.Market memory marketData = market.getMarket(0);
        console.log("Yes pool total:", marketData.totalYesPool);
        console.log("No pool total:", marketData.totalNoPool);
        console.log("Market resolved:", marketData.resolved);
    }
}
