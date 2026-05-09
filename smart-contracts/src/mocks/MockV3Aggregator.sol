// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract MockV3Aggregator {
    uint8 public decimals;
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint256 public latestRound;

    mapping(uint256 => int256) public getAnswer;
    mapping(uint256 => uint256) public getTimestamp;
    mapping(uint256 => uint256) public getsStartedAt;
    mapping(uint256 => uint256) public getsUpdatedAt;
    mapping(uint256 => uint8) public getExpirationStatus;

    function _updateAnswer(uint256 _roundId, int256 _answer, uint256 _timestamp) internal {
        latestAnswer = _answer;
        latestTimestamp = _timestamp;
        latestRound = _roundId;

        getAnswer[_roundId] = _answer;
        getTimestamp[_roundId] = _timestamp;
        getsStartedAt[_roundId] = _timestamp;
        getsUpdatedAt[_roundId] = _timestamp;
        getExpirationStatus[_roundId] = 0;
    }

    constructor(uint8 _decimals, int256 _initialPrice) {
        decimals = _decimals;
        _updateAnswer(1, _initialPrice, block.timestamp);
    }

    function updateAnswer(uint256 _roundId, int256 _answer, uint256 _timestamp) external {
        _updateAnswer(_roundId, _answer, _timestamp);
    }

    function updateAnswer(int256 _answer, uint256 _roundId) external {
        _updateAnswer(_roundId, _answer, block.timestamp);
    }

    function _getRoundData(uint80 _roundId)
        internal
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            getAnswer[_roundId],
            getsStartedAt[_roundId],
            getsUpdatedAt[_roundId],
            _roundId
        );
    }

    function getRoundData(uint80 _roundId) external view returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return _getRoundData(_roundId);
    }

    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return _getRoundData(uint80(latestRound));
    }

    function previousRoundData(uint80 _roundId) external view returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return _getRoundData(_roundId - 1);
    }
}
