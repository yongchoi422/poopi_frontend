// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SouliEthSale} from "../../src/SouliEthSale.sol";

/// @notice Disposable payment-test token. No inscriptions or monetary value.
/// The constructor also rejects accidental deployment on a production chain.
contract SepoliaTestSouli is ERC20 {
    constructor() ERC20("SOULI Sepolia Test - No Value", "tSOULI") {
        require(block.chainid == 84532, "Base Sepolia only");
        _mint(msg.sender, 10_000_000 * 1e9);
    }
    function decimals() public pure override returns (uint8) { return 9; }
}

/// @notice Same sale logic, with a testnet-only deployment guard.
contract SepoliaTestSale is SouliEthSale {
    constructor(address token_, address owner_, address treasury_, uint256 price_,
        uint256 cap_, uint256 walletCap_, uint256 start_, uint256 end_, bytes32 terms_)
        SouliEthSale(token_, owner_, treasury_, price_, cap_, walletCap_, start_, end_, terms_)
    { require(block.chainid == 84532, "Base Sepolia only"); }
}
