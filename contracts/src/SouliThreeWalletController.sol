// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SouliEthSale} from "./SouliEthSale.sol";

/// @notice Three independent operators, ONE authorization is sufficient.
/// This is deliberately NOT a multisig, recovery of personal wallet assets,
/// LP lock, or restricted-use treasury. Any one compromised operator can drain it.
/// No arbitrary target, recipient, delegatecall, upgrade, or operator replacement.
contract SouliThreeWalletController is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address[3] public operators;
    IERC20 public immutable token;
    SouliEthSale public immutable sale;
    uint256 private constant UNIT = 1e9;
    error InvalidOperators();
    error OperatorOnly();
    error UnexpectedTransfer();
    error NothingToWithdraw();
    error TransferFailed();
    error DirectPaymentDisabled();
    event SaleCreated(address indexed sale, address indexed token);
    event StockFunded(address indexed operator, uint256 wholeSouli);
    event StockRecovered(address indexed operator, uint256 tokenUnits);
    event EtherCollected(address indexed operator, uint256 amountWei);
    event HeldTokensRecovered(address indexed operator, uint256 tokenUnits);

    constructor(address token_, address[3] memory operators_, uint256 price_,
        uint256 cap_, uint256 walletCap_, uint256 start_, uint256 end_, bytes32 terms_)
    {
        for (uint256 i; i < 3; ++i) {
            if (operators_[i] == address(0) || operators_[i] == address(this)) revert InvalidOperators();
            for (uint256 j; j < i; ++j) if (operators_[i] == operators_[j]) revert InvalidOperators();
        }
        operators = operators_;
        token = IERC20(token_);
        sale = new SouliEthSale(token_, address(this), address(this), price_, cap_, walletCap_, start_, end_, terms_);
        emit SaleCreated(address(sale), token_);
    }
    function isOperator(address account) public view returns (bool) {
        return account == operators[0] || account == operators[1] || account == operators[2];
    }
    modifier onlyOperator() { if (!isOperator(msg.sender)) revert OperatorOnly(); _; }

    function pauseSale() external onlyOperator { sale.pause(); }
    function startSale() external onlyOperator { sale.unpause(); }

    /// @notice The caller supplies its own tokens; allowance is finite and consumed.
    function depositStock(uint256 wholeSouli) external onlyOperator nonReentrant {
        uint256 units = wholeSouli * UNIT;
        uint256 beforeHeld = token.balanceOf(address(this));
        uint256 beforeSender = token.balanceOf(msg.sender);
        token.safeTransferFrom(msg.sender, address(this), units);
        if (token.balanceOf(address(this)) != beforeHeld + units || token.balanceOf(msg.sender) != beforeSender - units) revert UnexpectedTransfer();
        token.forceApprove(address(sale), units);
        sale.deposit(wholeSouli);
        token.forceApprove(address(sale), 0);
        if (token.balanceOf(address(this)) != beforeHeld) revert UnexpectedTransfer();
        emit StockFunded(msg.sender, wholeSouli);
    }
    /// @notice Sale enforces pause. Only unsold stock, paid directly to this caller.
    function recoverInventory(uint256 wholeSouli) external onlyOperator nonReentrant {
        uint256 units = wholeSouli * UNIT;
        uint256 beforeHeld = token.balanceOf(address(this));
        sale.withdrawInventory(wholeSouli);
        if (token.balanceOf(address(this)) != beforeHeld + units) revert UnexpectedTransfer();
        _sendTokens(units);
        emit StockRecovered(msg.sender, units);
    }
    /// @notice Sale -> controller -> calling operator in one atomic transaction.
    /// Includes any forced ETH already held here; this is NOT a sales-revenue counter.
    function collectProceeds() external onlyOperator nonReentrant {
        if (address(sale).balance > 0) sale.withdrawProceeds();
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit EtherCollected(msg.sender, amount);
    }
    /// @notice Recover this project's tokens accidentally sent to the controller.
    /// Does not pull balances or approvals from anybody else's wallet.
    function recoverHeldTokens() external onlyOperator nonReentrant {
        uint256 units = token.balanceOf(address(this));
        if (units == 0) revert NothingToWithdraw();
        _sendTokens(units);
        emit HeldTokensRecovered(msg.sender, units);
    }
    function _sendTokens(uint256 units) private {
        uint256 beforeHeld = token.balanceOf(address(this));
        uint256 beforeReceiver = token.balanceOf(msg.sender);
        token.safeTransfer(msg.sender, units);
        if (token.balanceOf(address(this)) != beforeHeld - units || token.balanceOf(msg.sender) != beforeReceiver + units) revert UnexpectedTransfer();
    }
    receive() external payable {
        if (msg.sender != address(sale)) revert DirectPaymentDisabled();
    }
    fallback() external payable { revert DirectPaymentDisabled(); }
}
