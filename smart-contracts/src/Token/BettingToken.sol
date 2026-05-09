// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BettingToken is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1000 ether;

    constructor() ERC20("BettingToken", "BETT") {}

    function mint() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
