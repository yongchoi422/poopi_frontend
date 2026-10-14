// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;
import {SouliThreeWalletController} from "../../src/SouliThreeWalletController.sol";

/// @notice Guard the public playground against accidental mainnet deployment.
contract SepoliaThreeWalletController is SouliThreeWalletController {
    constructor(address token_, address[3] memory operators_, uint256 price_,
        uint256 cap_, uint256 walletCap_, uint256 start_, uint256 end_, bytes32 terms_)
        SouliThreeWalletController(token_, operators_, price_, cap_, walletCap_, start_, end_, terms_)
    { require(block.chainid == 84532, "Base Sepolia only"); }
}

contract RejectingOperator {
    function collect(SouliThreeWalletController controller) external { controller.collectProceeds(); }
    receive() external payable { revert("reject ETH"); }
}
