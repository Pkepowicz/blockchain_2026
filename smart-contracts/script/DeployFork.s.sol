// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Token/BettingToken.sol";
import "../src/Market/PredictionMarket.sol";
import "../src/interfaces/AggregatorV3Interface.sol";

contract DeployFork is Script {
    address constant BTC_USD = 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43;
    address constant ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;

    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        BettingToken token = new BettingToken();
        PredictionMarket market = new PredictionMarket(address(token));

        int256 btcStrike = _strikeBelow(BTC_USD, 95);
        int256 ethStrike = _strikeAbove(ETH_USD, 105);

        market.createMarket(BTC_USD, btcStrike, 5 minutes);
        market.createMarket(ETH_USD, ethStrike, 10 minutes);

        token.mint();

        vm.stopBroadcast();

        console.log("=== Sepolia Fork Deployment ===");
        console.log("BettingToken:", address(token));
        console.log("PredictionMarket:", address(market));
        console.log("Seeded markets:");
        console.log("  #0: BTC/USD | strike below live price (YES favored) | 5 min");
        console.log("  #1: ETH/USD | strike above live price (NO favored)  | 10 min");
        console.log("BTC/USD aggregator:", BTC_USD);
        console.log("ETH/USD aggregator:", ETH_USD);
        console.log("BTC strike:", uint256(btcStrike));
        console.log("ETH strike:", uint256(ethStrike));
    }

    function _readPrice(address _aggregator) internal view returns (int256) {
        (, int256 answer,,,) = AggregatorV3Interface(_aggregator).latestRoundData();
        require(answer > 0, "invalid oracle price");
        return answer;
    }

    function _strikeBelow(address _aggregator, uint256 _percent) internal view returns (int256) {
        return _readPrice(_aggregator) * int256(_percent) / 100;
    }

    function _strikeAbove(address _aggregator, uint256 _percent) internal view returns (int256) {
        return _readPrice(_aggregator) * int256(_percent) / 100;
    }
}
