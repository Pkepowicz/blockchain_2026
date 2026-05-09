// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/mocks/MockV3Aggregator.sol";

contract MockV3AggregatorTest is Test {
    MockV3Aggregator mock;

    function setUp() public {
        mock = new MockV3Aggregator(8, 50_000e8);
    }

    function test_initialState() public view {
        assertEq(mock.decimals(), 8);
        assertEq(mock.latestAnswer(), 50_000e8);
        assertEq(mock.latestRound(), 1);
    }

    function test_updatePrice() public {
        mock.updateAnswer(60_000e8, 2);

        assertEq(mock.latestAnswer(), 60_000e8);
        assertEq(mock.latestRound(), 2);
        assertEq(mock.getAnswer(2), 60_000e8);
    }

    function test_latestRoundData() public view {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = mock.latestRoundData();

        assertEq(roundId, 1);
        assertEq(answer, 50_000e8);
        assertGt(startedAt, 0);
        assertGt(updatedAt, 0);
        assertEq(answeredInRound, 1);
    }

    function test_getRoundData() public {
        mock.updateAnswer(70_000e8, 3);

        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = mock.getRoundData(3);

        assertEq(roundId, 3);
        assertEq(answer, 70_000e8);
        assertEq(answeredInRound, 3);
    }

    function test_multipleUpdates() public {
        mock.updateAnswer(55_000e8, 2);
        mock.updateAnswer(45_000e8, 3);

        assertEq(mock.latestAnswer(), 45_000e8);
        assertEq(mock.latestRound(), 3);
        assertEq(mock.getAnswer(1), 50_000e8);
        assertEq(mock.getAnswer(2), 55_000e8);
        assertEq(mock.getAnswer(3), 45_000e8);
    }
}
