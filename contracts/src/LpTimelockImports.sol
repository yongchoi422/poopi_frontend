// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Compile the unmodified, pinned OpenZeppelin implementation. Deployment uses
// VestingWallet(beneficiary, unlockTimestamp, 0): no custom withdrawal logic.
import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";
