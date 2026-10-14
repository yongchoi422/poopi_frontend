// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Inventory-funded, fixed ETH price, immediate delivery. NOT a DEX,
/// bonding curve, refund escrow, LP vault, or promise of a particular SVG.
/// Whole SOULI quantities avoid the original ERC20i's fractional seed rounding.
contract SouliEthSale is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 public constant TOKEN_UNIT = 1e9;
    uint256 public constant VERSION = 1;
    IERC20 public immutable souli;
    address public immutable treasury;
    uint256 public immutable unitPriceWei;
    uint256 public immutable saleCap;
    uint256 public immutable walletCap;
    uint256 public immutable startsAt;
    uint256 public immutable endsAt;
    bytes32 public immutable termsHash;
    uint256 public sold;
    uint256 public proceedsWei;
    mapping(address => uint256) public purchased;

    error InvalidConfiguration();
    error InvalidQuantity();
    error SaleClosed();
    error QuoteExpired();
    error WrongPayment();
    error InsufficientInventory();
    error WalletLimit();
    error UnexpectedTokenTransfer();
    error WrongRecipient();
    error TreasuryOnly();
    error EtherTransferFailed();
    error DirectPaymentDisabled();
    error RenounceDisabled();

    event InventoryAdded(address indexed owner, uint256 tokenUnits);
    event InventoryRemoved(address indexed owner, uint256 tokenUnits);
    event Purchased(address indexed buyer, uint256 wholeSouli, uint256 paidWei);
    event ProceedsWithdrawn(address indexed treasury, uint256 amountWei);

    constructor(address token_, address owner_, address treasury_, uint256 price_,
        uint256 saleCap_, uint256 walletCap_, uint256 startsAt_, uint256 endsAt_, bytes32 termsHash_)
        Ownable(owner_)
    {
        if (token_.code.length == 0 || treasury_ == address(0) || treasury_ == address(this)
            || price_ == 0 || saleCap_ == 0 || walletCap_ == 0 || walletCap_ > saleCap_
            || saleCap_ > type(uint256).max / TOKEN_UNIT || price_ > type(uint256).max / saleCap_
            || endsAt_ <= startsAt_ || endsAt_ <= block.timestamp || termsHash_ == bytes32(0)
            || IERC20Metadata(token_).decimals() != 9) revert InvalidConfiguration();
        souli = IERC20(token_); treasury = treasury_; unitPriceWei = price_;
        saleCap = saleCap_; walletCap = walletCap_; startsAt = startsAt_; endsAt = endsAt_; termsHash = termsHash_;
        _pause();
    }

    function available() public view returns (uint256) {
        uint256 inventory = souli.balanceOf(address(this)) / TOKEN_UNIT;
        uint256 left = saleCap - sold;
        return inventory < left ? inventory : left;
    }

    function quote(uint256 wholeSouli) public view returns (uint256) {
        if (wholeSouli == 0 || wholeSouli > saleCap) revert InvalidQuantity();
        return wholeSouli * unitPriceWei;
    }

    /// @dev Receiver is always msg.sender, never a server-supplied destination.
    /// Any failed transfer or wrong delta reverts payment and accounting together.
    function buy(uint256 wholeSouli, uint256 deadline) external payable nonReentrant whenNotPaused {
        if (block.timestamp < startsAt || block.timestamp >= endsAt) revert SaleClosed();
        if (block.timestamp > deadline) revert QuoteExpired();
        if (msg.sender == address(souli) || msg.sender == address(this)) revert WrongRecipient();
        uint256 cost = quote(wholeSouli);
        if (msg.value != cost) revert WrongPayment();
        if (wholeSouli > available()) revert InsufficientInventory();
        if (wholeSouli > walletCap - purchased[msg.sender]) revert WalletLimit();
        uint256 units = wholeSouli * TOKEN_UNIT;
        uint256 beforeBuyer = souli.balanceOf(msg.sender);
        uint256 beforeSale = souli.balanceOf(address(this));
        purchased[msg.sender] += wholeSouli; sold += wholeSouli; proceedsWei += msg.value;
        souli.safeTransfer(msg.sender, units);
        if (souli.balanceOf(msg.sender) != beforeBuyer + units
            || souli.balanceOf(address(this)) != beforeSale - units) revert UnexpectedTokenTransfer();
        emit Purchased(msg.sender, wholeSouli, msg.value);
    }

    /// @notice Approve only the intended stock amount, then call deposit.
    /// The original token can change the depositor's artwork during this transfer.
    function deposit(uint256 wholeSouli) external onlyOwner nonReentrant {
        if (wholeSouli == 0 || wholeSouli > saleCap) revert InvalidQuantity();
        uint256 units = wholeSouli * TOKEN_UNIT;
        uint256 beforeSale = souli.balanceOf(address(this));
        uint256 beforeOwner = souli.balanceOf(msg.sender);
        souli.safeTransferFrom(msg.sender, address(this), units);
        if (souli.balanceOf(address(this)) != beforeSale + units
            || souli.balanceOf(msg.sender) != beforeOwner - units) revert UnexpectedTokenTransfer();
        emit InventoryAdded(msg.sender, units);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner {
        if (block.timestamp >= endsAt || available() == 0) revert SaleClosed();
        _unpause();
    }

    /// @notice The operator can withdraw unsold stock while paused. No buyer has
    /// a pending claim in this immediate-delivery design. Disclosure is in terms.
    function withdrawInventory(uint256 wholeSouli) external onlyOwner nonReentrant whenPaused {
        if (wholeSouli == 0 || wholeSouli > souli.balanceOf(address(this)) / TOKEN_UNIT) revert InvalidQuantity();
        uint256 units = wholeSouli * TOKEN_UNIT;
        souli.safeTransfer(msg.sender, units);
        emit InventoryRemoved(msg.sender, units);
    }

    /// @notice Pull proceeds to the immutable treasury. Buying never invokes the
    /// treasury, so a treasury that rejects ETH cannot block token delivery.
    function withdrawProceeds() external nonReentrant {
        if (msg.sender != treasury) revert TreasuryOnly();
        uint256 amount = address(this).balance;
        if (amount == 0) revert WrongPayment();
        (bool ok,) = payable(treasury).call{value: amount}("");
        if (!ok) revert EtherTransferFailed();
        emit ProceedsWithdrawn(treasury, amount);
    }

    function renounceOwnership() public override onlyOwner { revert RenounceDisabled(); }
    receive() external payable { revert DirectPaymentDisabled(); }
    fallback() external payable { revert DirectPaymentDisabled(); }
}
