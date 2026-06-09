// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Token/BettingToken.sol";
import "../src/mocks/MockV3Aggregator.sol";
import "../src/Market/PredictionMarket.sol";

contract PredictionMarketTest is Test {
    BettingToken token;
    MockV3Aggregator mock;
    PredictionMarket market;

    address owner = address(0x1);
    address user1 = address(0x2);
    address user2 = address(0x3);
    address user3 = address(0x4);

    function setUp() public {
        token = new BettingToken();
        mock = new MockV3Aggregator(18, 50_000e18);
        vm.prank(owner);
        market = new PredictionMarket(address(token));

        vm.startPrank(owner);
        token.mint();
        token.approve(address(market), type(uint256).max);
        market.createMarket(address(mock), 50_000e18, 1 days);
        vm.stopPrank();

        vm.prank(user1);
        token.mint();
        vm.prank(user2);
        token.mint();
        vm.prank(user3);
        token.mint();
    }

    function test_createMarket() public view {
        (address aggregator, address creator, int256 strikePrice, uint256 endTime, bool resolved, bool yesWins, uint256 totalYesPool, uint256 totalNoPool, bool creatorClaimed) = market.markets(0);
        assertEq(aggregator, address(mock));
        assertEq(creator, owner);
        assertEq(strikePrice, 50_000e18);
        assertGt(endTime, block.timestamp);
        assertEq(resolved, false);
        assertEq(yesWins, false);
        assertEq(totalYesPool, 0);
        assertEq(totalNoPool, 0);
        assertEq(creatorClaimed, false);
    }

    function test_createMarket_anyoneCanCreateWithFee() public {
        vm.startPrank(user1);
        token.approve(address(market), market.MARKET_CREATION_FEE());
        market.createMarket(address(mock), 60_000e18, 1 days);
        vm.stopPrank();

        (address aggregator, address creator, int256 strikePrice, uint256 endTime, bool resolved, bool yesWins, uint256 totalYesPool, uint256 totalNoPool, bool creatorClaimed) = market.markets(1);
        assertEq(aggregator, address(mock));
        assertEq(creator, user1);
        assertEq(strikePrice, 60_000e18);
        assertGt(endTime, block.timestamp);
        assertEq(resolved, false);
        assertEq(yesWins, false);
        assertEq(totalYesPool, 0);
        assertEq(totalNoPool, 0);
        assertEq(creatorClaimed, false);

        assertEq(token.balanceOf(address(market)), market.MARKET_CREATION_FEE() * 2);
        assertEq(market.nextMarketId(), 2);
    }

    function test_placeYesBet() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);

        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        (, , , , , , uint256 totalYesPool, , ) = market.markets(0);
        assertEq(totalYesPool, 100 ether);

        (uint256 amount, bool isYes, ) = market.userBets(0, user1);
        assertEq(amount, 100 ether);
        assertEq(isYes, true);
    }

    function test_placeNoBet() public {
        vm.prank(user1);
        token.approve(address(market), 50 ether);

        vm.prank(user1);
        market.placeBet(0, false, 50 ether);

        (, , , , , , , uint256 totalNoPool, ) = market.markets(0);
        assertEq(totalNoPool, 50 ether);

        (uint256 amount, bool isYes, ) = market.userBets(0, user1);
        assertEq(amount, 50 ether);
        assertEq(isYes, false);
    }

    function test_placeBet_noApprovalReverts() public {
        vm.prank(user1);
        vm.expectRevert();
        market.placeBet(0, true, 100 ether);
    }

    function test_placeBet_insufficientApprovalReverts() public {
        vm.prank(user1);
        token.approve(address(market), 10 ether);

        vm.prank(user1);
        vm.expectRevert();
        market.placeBet(0, true, 100 ether);
    }

    function test_placeBet_afterResolutionReverts() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        mock.updateAnswer(60_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);
        market.resolveMarket(0);

        vm.prank(user2);
        token.approve(address(market), 50 ether);
        vm.prank(user2);
        vm.expectRevert();
        market.placeBet(0, true, 50 ether);
    }

    function test_placeBet_afterEndTimeReverts() public {
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        vm.expectRevert();
        market.placeBet(0, true, 100 ether);
    }

    function test_placeBet_zeroAmountReverts() public {
        vm.prank(user1);
        token.approve(address(market), 0);
        vm.prank(user1);
        vm.expectRevert();
        market.placeBet(0, true, 0);
    }

    function test_placeBet_invalidMarketReverts() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        vm.expectRevert();
        market.placeBet(999, true, 100 ether);
    }

    function test_resolveMarket_yesWins() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        vm.prank(user2);
        token.approve(address(market), 50 ether);
        vm.prank(user2);
        market.placeBet(0, false, 50 ether);

        mock.updateAnswer(60_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);

        market.resolveMarket(0);

        (, , , , bool resolved, bool yesWins, , , ) = market.markets(0);
        assertEq(resolved, true);
        assertEq(yesWins, true);
    }

    function test_resolveMarket_noWins() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        vm.prank(user2);
        token.approve(address(market), 50 ether);
        vm.prank(user2);
        market.placeBet(0, false, 50 ether);

        mock.updateAnswer(40_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);

        market.resolveMarket(0);

        (, , , , bool resolved, bool yesWins, , , ) = market.markets(0);
        assertEq(resolved, true);
        assertEq(yesWins, false);
    }

    function test_resolveMarket_beforeEndTimeReverts() public {
        vm.expectRevert();
        market.resolveMarket(0);
    }

    function test_resolveMarket_twiceReverts() public {
        mock.updateAnswer(60_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);

        market.resolveMarket(0);
        vm.expectRevert();
        market.resolveMarket(0);
    }

    function test_claimWinnings_proportionalPayout() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        vm.prank(user2);
        token.approve(address(market), 100 ether);
        vm.prank(user2);
        market.placeBet(0, true, 100 ether);

        vm.prank(user3);
        token.approve(address(market), 50 ether);
        vm.prank(user3);
        market.placeBet(0, false, 50 ether);

        mock.updateAnswer(60_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);
        market.resolveMarket(0);

        uint256 balanceBefore1 = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(0);
        uint256 payout1 = token.balanceOf(user1) - balanceBefore1;

        uint256 balanceBefore2 = token.balanceOf(user2);
        vm.prank(user2);
        market.claimWinnings(0);
        uint256 payout2 = token.balanceOf(user2) - balanceBefore2;

        assertEq(payout1, payout2);
        assertEq(payout1, 125 ether);
    }

    function test_claimWinnings_loserReverts() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        vm.prank(user2);
        token.approve(address(market), 50 ether);
        vm.prank(user2);
        market.placeBet(0, false, 50 ether);

        mock.updateAnswer(60_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);
        market.resolveMarket(0);

        vm.prank(user2);
        vm.expectRevert();
        market.claimWinnings(0);
    }

    function test_claimWinnings_doubleClaimReverts() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        mock.updateAnswer(60_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);
        market.resolveMarket(0);

        vm.prank(user1);
        market.claimWinnings(0);
        vm.prank(user1);
        vm.expectRevert();
        market.claimWinnings(0);
    }

    function test_claimWinnings_unresolvedReverts() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        vm.prank(user1);
        vm.expectRevert();
        market.claimWinnings(0);
    }

    function test_claimWinnings_noBetReverts() public {
        mock.updateAnswer(60_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);
        market.resolveMarket(0);

        vm.prank(user3);
        vm.expectRevert();
        market.claimWinnings(0);
    }

    function test_claimWinnings_autoResolvesAfterEndTime() public {
        vm.prank(user1);
        token.approve(address(market), 100 ether);
        vm.prank(user1);
        market.placeBet(0, true, 100 ether);

        mock.updateAnswer(60_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);

        uint256 balanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(0);

        (, , , , bool resolved, bool yesWins, , , ) = market.markets(0);
        assertEq(resolved, true);
        assertEq(yesWins, true);
        assertEq(token.balanceOf(user1) - balanceBefore, 100 ether);
    }

    function test_claimWinnings_creatorClaimsPoolWhenNoWinners() public {
        vm.startPrank(user1);
        token.approve(address(market), market.MARKET_CREATION_FEE());
        market.createMarket(address(mock), 60_000e18, 1 days);
        vm.stopPrank();

        vm.prank(user2);
        token.approve(address(market), 100 ether);
        vm.prank(user2);
        market.placeBet(1, false, 100 ether);

        vm.prank(user3);
        token.approve(address(market), 50 ether);
        vm.prank(user3);
        market.placeBet(1, false, 50 ether);

        mock.updateAnswer(70_000e18, 1);
        vm.warp(block.timestamp + 1 days + 1);

        uint256 creatorBalanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(1);

        (, , , , bool resolved, bool yesWins, uint256 totalYesPool, uint256 totalNoPool, ) = market.markets(1);
        assertEq(resolved, true);
        assertEq(yesWins, true);
        assertEq(totalYesPool, 0);
        assertEq(totalNoPool, 150 ether);
        assertEq(token.balanceOf(user1) - creatorBalanceBefore, 150 ether);

        vm.prank(user2);
        vm.expectRevert();
        market.claimWinnings(1);
    }
}
