// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IBettingToken.sol";
import "../interfaces/AggregatorV3Interface.sol";

contract PredictionMarket is Ownable {
    IBettingToken public token;

    struct Market {
        address aggregator;
        int256 strikePrice;
        uint256 endTime;
        bool resolved;
        bool yesWins;
        uint256 totalYesPool;
        uint256 totalNoPool;
    }

    struct Bet {
        uint256 amount;
        bool isYes;
        bool claimed;
    }

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Bet)) public userBets;

    event MarketCreated(
        uint256 indexed marketId,
        address aggregator,
        int256 strikePrice,
        uint256 endTime
    );
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool isYes,
        uint256 amount
    );
    event MarketResolved(
        uint256 indexed marketId,
        bool yesWins,
        int256 price
    );
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    constructor(address _token) {
        token = IBettingToken(_token);
    }

    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }

    function createMarket(
        address _aggregator,
        int256 _strikePrice,
        uint256 _duration
    ) external onlyOwner {
        require(_aggregator != address(0), "invalid aggregator");
        require(_strikePrice > 0, "invalid strike price");
        require(_duration > 0, "invalid duration");

        uint256 marketId = nextMarketId;

        markets[marketId] = Market({
            aggregator: _aggregator,
            strikePrice: _strikePrice,
            endTime: block.timestamp + _duration,
            resolved: false,
            yesWins: false,
            totalYesPool: 0,
            totalNoPool: 0
        });

        emit MarketCreated(marketId, _aggregator, _strikePrice, markets[marketId].endTime);

        nextMarketId++;
    }

    modifier autoResolve(uint256 _marketId) {
        require(_marketId < nextMarketId, "invalid market");
        if (!markets[_marketId].resolved && block.timestamp >= markets[_marketId].endTime) {
            _resolveMarket(_marketId);
        }
        _;
    }

    function placeBet(
        uint256 _marketId,
        bool _isYes,
        uint256 _amount
    ) external autoResolve(_marketId) {
        require(_amount > 0, "zero bet");
        require(!markets[_marketId].resolved, "market resolved");
        require(block.timestamp < markets[_marketId].endTime, "market ended");

        token.transferFrom(msg.sender, address(this), _amount);

        if (_isYes) {
            markets[_marketId].totalYesPool += _amount;
        } else {
            markets[_marketId].totalNoPool += _amount;
        }

        Bet storage bet = userBets[_marketId][msg.sender];
        if (bet.amount > 0) {
            require(bet.isYes == _isYes, "outcome mismatch");
            bet.amount += _amount;
        } else {
            bet.amount = _amount;
            bet.isYes = _isYes;
            bet.claimed = false;
        }

        emit BetPlaced(_marketId, msg.sender, _isYes, _amount);
    }

    function resolveMarket(uint256 _marketId) external {
        require(_marketId < nextMarketId, "invalid market");
        require(!markets[_marketId].resolved, "already resolved");
        require(block.timestamp >= markets[_marketId].endTime, "not ended yet");

        Market storage market = markets[_marketId];
        AggregatorV3Interface aggregator = AggregatorV3Interface(market.aggregator);

        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = aggregator.latestRoundData();

        require(roundId != 0, "invalid round");
        require(startedAt != 0, "no data");
        require(updatedAt != 0, "no data");
        require(updatedAt >= startedAt, "invalid timestamps");
        require(answeredInRound >= roundId, "round not answered");

        market.resolved = true;
        market.yesWins = price > market.strikePrice;

        emit MarketResolved(_marketId, market.yesWins, price);
    }

    function _resolveMarket(uint256 _marketId) internal {
        Market storage market = markets[_marketId];
        AggregatorV3Interface aggregator = AggregatorV3Interface(market.aggregator);

        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = aggregator.latestRoundData();

        require(roundId != 0, "invalid round");
        require(startedAt != 0, "no data");
        require(updatedAt != 0, "no data");
        require(updatedAt >= startedAt, "invalid timestamps");
        require(answeredInRound >= roundId, "round not answered");

        market.resolved = true;
        market.yesWins = price > market.strikePrice;

        emit MarketResolved(_marketId, market.yesWins, price);
    }

    function claimWinnings(uint256 _marketId) external autoResolve(_marketId) {
        require(markets[_marketId].resolved, "not resolved");

        Bet storage bet = userBets[_marketId][msg.sender];
        require(bet.amount > 0, "no bet placed");
        require(!bet.claimed, "already claimed");

        Market storage market = markets[_marketId];
        require(market.yesWins == bet.isYes, "no winner");

        bet.claimed = true;

        uint256 totalWinners;
        if (market.yesWins) {
            totalWinners = market.totalYesPool;
        } else {
            totalWinners = market.totalNoPool;
        }

        uint256 loserPool = market.yesWins ? market.totalNoPool : market.totalYesPool;
        uint256 payout = (bet.amount * (totalWinners + loserPool)) / totalWinners;

        token.transfer(msg.sender, payout);

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }
}
