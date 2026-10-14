// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;
import {SouliThreeWalletController} from "../../src/SouliThreeWalletController.sol";

// Isolated local fixture: do not change the source metadata of public testnet contracts.
contract ReentrantOperator {
    SouliThreeWalletController private target;
    bool public callbackSucceeded;
    uint256 public received;
    function collect(SouliThreeWalletController controller) external {
        target = controller;
        controller.collectProceeds();
    }
    receive() external payable {
        received += msg.value;
        (bool ok,) = address(target).call(abi.encodeCall(target.collectProceeds, ()));
        callbackSucceeded = ok;
    }
}
