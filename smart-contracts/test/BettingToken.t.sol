// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../src/Token/BettingToken.sol";

contract BettingTokenTest is Test {
    BettingToken token;

    address user1 = address(0x1);
    address user2 = address(0x2);

    function setUp() public {
        token = new BettingToken();
    }

    function test_initialState() public view {
        assertEq(token.name(), "BettingToken");
        assertEq(token.symbol(), "BETT");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
    }

    function test_mint() public {
        vm.prank(user1);
        token.mint();

        assertEq(token.balanceOf(user1), 1000 ether);
        assertEq(token.totalSupply(), 1000 ether);
    }

    function test_mintMultipleTimes() public {
        vm.prank(user1);
        token.mint();

        vm.prank(user1);
        token.mint();

        assertEq(token.balanceOf(user1), 2000 ether);
        assertEq(token.totalSupply(), 2000 ether);
    }

    function test_transfer() public {
        vm.prank(user1);
        token.mint();

        vm.prank(user1);
        token.transfer(user2, 100 ether);

        assertEq(token.balanceOf(user1), 900 ether);
        assertEq(token.balanceOf(user2), 100 ether);
    }

    function test_approveAndTransferFrom() public {
        vm.prank(user1);
        token.mint();

        vm.prank(user1);
        token.approve(user2, 500 ether);

        assertEq(token.allowance(user1, user2), 500 ether);

        vm.prank(user2);
        token.transferFrom(user1, user2, 200 ether);

        assertEq(token.balanceOf(user1), 800 ether);
        assertEq(token.balanceOf(user2), 200 ether);
        assertEq(token.allowance(user1, user2), 300 ether);
    }

    function test_transferReverts_InsufficientBalance() public {
        vm.prank(user1);
        token.mint();

        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, 1001 ether);
    }

    function test_transferFromReverts_InsufficientAllowance() public {
        vm.prank(user1);
        token.mint();

        vm.prank(user1);
        token.approve(user2, 50 ether);

        vm.prank(user2);
        vm.expectRevert();
        token.transferFrom(user1, user2, 100 ether);
    }
}
