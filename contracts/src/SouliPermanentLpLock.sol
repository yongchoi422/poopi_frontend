// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Irreversible v2 LP custody. No owner, transfer, approval, arbitrary
/// call, upgrade, fee collection or selfdestruct. Deploy only after review.
contract SouliPermanentLpLock {
    address public immutable pair;
    constructor(address pair_) { pair = pair_; }
    function lockedBalance() external view returns (uint256) {
        return IERC20(pair).balanceOf(address(this));
    }
}
