// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SouliPermanentLpLock} from "./SouliPermanentLpLock.sol";

interface ILpFactory {
    function getPair(address,address) external view returns(address);
    function createPair(address,address) external returns(address);
}
interface ILpPair is IERC20 {
    function token0() external view returns(address);
    function token1() external view returns(address);
    function getReserves() external view returns(uint112,uint112,uint32);
    function skim(address) external;
    function mint(address) external returns(uint256);
}
interface ILpWeth { function deposit() external payable; }
interface ILpRouter {
    function factory() external view returns(address);
    function WETH() external view returns(address);
    function addLiquidityETH(address,uint256,uint256,uint256,address,uint256)
        external payable returns(uint256,uint256,uint256);
}

/// @notice Candidate, NOT approved for live sale. Immediate delivery; all
/// accounted ETH can only enter one immutable v2 pair, with LP minted directly
/// to a new irreversible lock. No refund, proceeds withdrawal or upgrade.
contract SouliLpSale is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 public constant TOKEN_UNIT = 1e9;
    uint256 public constant VERSION = 1;
    IERC20 public immutable souli;
    IERC20 public immutable weth;
    ILpRouter public immutable router;
    ILpPair public immutable pair;
    SouliPermanentLpLock public immutable lpLock;
    uint256 public immutable unitPriceWei;
    uint256 public immutable saleCap;
    uint256 public immutable targetWei;
    uint256 public immutable baseLpUnits;
    uint256 public immutable requiredLpUnits;
    uint256 public immutable priceToleranceBps;
    uint256 public immutable startsAt;
    bytes32 public immutable termsHash;

    uint256 public inventoryUnits;
    uint256 public lpReserveUnits;
    uint256 public sold;
    uint256 public purchaseWei;
    uint256 public supportWei;
    uint256 public suppliedWei;
    uint256 public suppliedTokenUnits;
    uint256 public mintedLockedLp;
    bool public activated;
    bool public launched;
    bool private finalizing;
    mapping(address => uint256) public purchased;

    struct Config {
        address token; address admin; address router; address factory; address weth;
        uint256 price; uint256 cap; uint256 startsAt; uint256 toleranceBps; bytes32 termsHash;
    }
    error InvalidConfiguration();
    error InvalidQuantity();
    error FundingClosed();
    error QuoteExpired();
    error WrongPayment();
    error InsufficientInventory();
    error UnexpectedTransfer();
    error ReserveNotReady();
    error UnsafePool();
    error PriceOutsideTerms();
    error InvalidLiquidityReceipt();
    error DirectPaymentDisabled();
    error RenounceDisabled();

    event InventoryAdded(uint256 units);
    event InventoryRemoved(address indexed admin, uint256 units);
    event LpReserveAdded(uint256 units);
    event Purchased(address indexed buyer, uint256 wholeSouli, uint256 paidWei);
    event Supported(address indexed supporter, uint256 amountWei);
    event LiquidityLocked(address indexed pair, address indexed lock, uint256 ethWei, uint256 tokenUnits, uint256 lpUnits);

    constructor(Config memory c) Ownable(c.admin) {
        if ((block.chainid != 31337 && block.chainid != 84532 && block.chainid != 8453)
            || c.token.code.length == 0 || c.router.code.length == 0 || c.factory.code.length == 0
            || c.weth.code.length == 0 || c.token == c.weth || c.price == 0 || c.cap == 0
            || c.cap > type(uint112).max / (2 * TOKEN_UNIT) || c.price > type(uint112).max / (2 * c.cap)
            || c.toleranceBps > 100 || c.termsHash == bytes32(0) || IERC20Metadata(c.token).decimals() != 9
            || ILpRouter(c.router).factory() != c.factory || ILpRouter(c.router).WETH() != c.weth)
            revert InvalidConfiguration();
        // Test chains deliberately permit fixtures. Base mainnet binds the exact
        // observed original and official immutable v2 dependencies, not a URL.
        if (block.chainid == 8453 && (
            c.token != 0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF
            || c.router != 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24
            || c.factory != 0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6
            || c.weth != 0x4200000000000000000000000000000000000006
            || c.token.codehash != 0x9afd2c3834d86fbf79beb22fd67e02e95f616e7606250f8b7d6e1cc6ff36574c
            || c.router.codehash != 0xec2a9bc649a4a1f23eee18c570628b28c03c665cdd7ebbdb3c46a6c4007959c1
            || c.factory.codehash != 0xbab145d02e7005f0d84c6c1639d39b799b0ea16df99ebbdaf5a14d9da820b4e0))
            revert InvalidConfiguration();
        souli = IERC20(c.token); weth = IERC20(c.weth); router = ILpRouter(c.router);
        unitPriceWei = c.price; saleCap = c.cap; targetWei = c.price * c.cap;
        baseLpUnits = c.cap * TOKEN_UNIT;
        requiredLpUnits = baseLpUnits + Math.mulDiv(baseLpUnits, c.toleranceBps, 10000, Math.Rounding.Ceil);
        priceToleranceBps = c.toleranceBps; startsAt = c.startsAt; termsHash = c.termsHash;
        address p = ILpFactory(c.factory).getPair(c.token, c.weth);
        if (p == address(0)) p = ILpFactory(c.factory).createPair(c.token, c.weth);
        if (p.code.length == 0 || !((ILpPair(p).token0() == c.token && ILpPair(p).token1() == c.weth)
            || (ILpPair(p).token1() == c.token && ILpPair(p).token0() == c.weth))) revert InvalidConfiguration();
        pair = ILpPair(p); lpLock = new SouliPermanentLpLock(p);
        _pause();
    }

    function fundedWei() public view returns(uint256) { return purchaseWei + supportWei; }
    function remainingWei() public view returns(uint256) { return targetWei - fundedWei(); }
    function available() public view returns(uint256) {
        if (launched) return 0;
        return Math.min(inventoryUnits / TOKEN_UNIT, Math.min(saleCap - sold, remainingWei() / unitPriceWei));
    }
    function state() external view returns(uint8) {
        return launched ? 3 : !activated ? 0 : remainingWei() == 0 ? 2 : 1;
    }
    function quote(uint256 wholeSouli) public view returns(uint256) {
        if (wholeSouli == 0 || wholeSouli > saleCap) revert InvalidQuantity();
        return wholeSouli * unitPriceWei;
    }
    function buy(uint256 wholeSouli, uint256 deadline) external payable nonReentrant whenNotPaused {
        if (!activated || launched || block.timestamp < startsAt || remainingWei() == 0) revert FundingClosed();
        if (block.timestamp > deadline) revert QuoteExpired();
        if (msg.value != quote(wholeSouli)) revert WrongPayment();
        if (wholeSouli > available()) revert InsufficientInventory();
        if (msg.sender == address(souli) || msg.sender == address(pair) || msg.sender == address(lpLock)) revert InvalidConfiguration();
        uint256 units = wholeSouli * TOKEN_UNIT;
        inventoryUnits -= units; sold += wholeSouli; purchased[msg.sender] += wholeSouli; purchaseWei += msg.value;
        _sendExact(msg.sender, units);
        emit Purchased(msg.sender, wholeSouli, msg.value);
    }
    /// @notice No tokens, LP ownership or refund claim is granted by support.
    /// Pausing purchases does not give the admin a veto over LP completion.
    function support() external payable nonReentrant {
        if (!activated || launched || block.timestamp < startsAt || remainingWei() == 0) revert FundingClosed();
        if (msg.value == 0 || msg.value > remainingWei()) revert WrongPayment();
        supportWei += msg.value; emit Supported(msg.sender, msg.value);
    }
    function depositInventory(uint256 wholeSouli) external onlyOwner nonReentrant {
        if (launched || wholeSouli == 0 || wholeSouli > saleCap - sold - inventoryUnits / TOKEN_UNIT) revert InvalidQuantity();
        uint256 units = wholeSouli * TOKEN_UNIT; _pullExact(units); inventoryUnits += units;
        emit InventoryAdded(units);
    }
    function depositLpReserve(uint256 units) external onlyOwner nonReentrant {
        if (activated || units == 0 || units > requiredLpUnits - lpReserveUnits) revert InvalidQuantity();
        _pullExact(units); lpReserveUnits += units; emit LpReserveAdded(units);
    }
    function withdrawInventory(uint256 wholeSouli) external onlyOwner nonReentrant whenPaused {
        if (wholeSouli == 0 || wholeSouli > inventoryUnits / TOKEN_UNIT) revert InvalidQuantity();
        uint256 units = wholeSouli * TOKEN_UNIT; inventoryUnits -= units;
        _sendExact(msg.sender, units); emit InventoryRemoved(msg.sender, units);
    }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner {
        if (launched || available() == 0) revert FundingClosed();
        if (lpReserveUnits != requiredLpUnits || souli.balanceOf(address(this)) < lpReserveUnits + inventoryUnits
            || (!activated && inventoryUnits != saleCap * TOKEN_UNIT)) revert ReserveNotReady();
        activated = true; _unpause();
    }

    /// @notice Anyone may finalize under immutable terms, even while paused.
    /// Reverts atomically on unsafe reserves, wrong deltas, missing LP or any
    /// dependency failure. A persistently bad existing pool can block launch.
    function finalize() external nonReentrant {
        if (!activated || launched || fundedWei() != targetWei) revert FundingClosed();
        if (lpReserveUnits != requiredLpUnits || souli.balanceOf(address(this)) < lpReserveUnits + inventoryUnits
            || address(this).balance < targetWei) revert ReserveNotReady();
        (uint112 r0, uint112 r1,) = pair.getReserves();
        (uint256 rt, uint256 re) = pair.token0() == address(souli) ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        // Unsynced dust is permissionlessly skimmable; direct it into the same
        // irreversible lock, never to a caller/admin. Synced bad prices reject.
        if (souli.balanceOf(address(pair)) > rt || weth.balanceOf(address(pair)) > re) pair.skim(address(lpLock));
        if (souli.balanceOf(address(pair)) != rt || weth.balanceOf(address(pair)) != re) revert UnsafePool();
        uint256 supply = pair.totalSupply();
        uint256 desired = baseLpUnits;
        uint256 minimum = baseLpUnits;
        uint256 minLp;
        if (supply == 0) {
            // No LP owner exists yet. Initialize directly so a one-sided sync
            // cannot break the router's division. Bound the resulting price,
            // including previously synced gifts, before depositing anything.
            uint256 postScaled = (rt + baseLpUnits) * targetWei * 10000;
            if (postScaled < (re + targetWei) * baseLpUnits * (10000 - priceToleranceBps)
                || postScaled > (re + targetWei) * baseLpUnits * (10000 + priceToleranceBps)) revert PriceOutsideTerms();
            uint256 root = Math.sqrt(baseLpUnits * targetWei);
            if (root <= 1000) revert UnsafePool();
            minLp = root - 1000;
        } else {
            if (rt == 0 || re == 0) revert UnsafePool();
            uint256 scaled = rt * targetWei * 10000;
            if (scaled < re * baseLpUnits * (10000 - priceToleranceBps)
                || scaled > re * baseLpUnits * (10000 + priceToleranceBps)) revert PriceOutsideTerms();
            minimum = Math.mulDiv(targetWei, rt, re);
            desired = Math.mulDiv(targetWei, rt, re, Math.Rounding.Ceil);
            if (minimum == 0 || desired > lpReserveUnits) revert UnsafePool();
            minLp = Math.min(Math.mulDiv(minimum, supply, rt), Math.mulDiv(targetWei, supply, re));
            if (minLp == 0) revert UnsafePool();
        }
        uint256 beforeToken = souli.balanceOf(address(this));
        uint256 beforeEth = address(this).balance;
        uint256 beforeLp = pair.balanceOf(address(lpLock));
        uint256 usedToken; uint256 usedEth; uint256 liquidity;
        if (supply == 0) {
            usedToken = baseLpUnits; usedEth = targetWei;
            ILpWeth(address(weth)).deposit{value: targetWei}();
            weth.safeTransfer(address(pair), targetWei);
            souli.safeTransfer(address(pair), baseLpUnits);
            liquidity = pair.mint(address(lpLock));
        } else {
            souli.forceApprove(address(router), desired);
            finalizing = true;
            (usedToken, usedEth, liquidity) = router.addLiquidityETH{value: targetWei}(
                address(souli), desired, minimum, targetWei, address(lpLock), block.timestamp);
            finalizing = false;
            souli.forceApprove(address(router), 0);
        }
        if (usedEth != targetWei || usedToken < minimum || usedToken > desired
            || beforeEth - address(this).balance != targetWei
            || beforeToken - souli.balanceOf(address(this)) != usedToken
            || souli.balanceOf(address(pair)) != rt + usedToken || weth.balanceOf(address(pair)) != re + targetWei
            || liquidity < minLp || pair.balanceOf(address(lpLock)) - beforeLp != liquidity)
            revert InvalidLiquidityReceipt();
        lpReserveUnits -= usedToken; suppliedWei = usedEth; suppliedTokenUnits = usedToken; mintedLockedLp = liquidity;
        launched = true; if (!paused()) _pause();
        emit LiquidityLocked(address(pair), address(lpLock), usedEth, usedToken, liquidity);
    }
    function _pullExact(uint256 units) private {
        uint256 beforeSale = souli.balanceOf(address(this));
        uint256 beforeOwner = souli.balanceOf(msg.sender);
        souli.safeTransferFrom(msg.sender, address(this), units);
        if (souli.balanceOf(address(this)) != beforeSale + units || souli.balanceOf(msg.sender) != beforeOwner - units) revert UnexpectedTransfer();
    }
    function _sendExact(address to, uint256 units) private {
        uint256 beforeSale = souli.balanceOf(address(this));
        uint256 beforeTo = souli.balanceOf(to);
        souli.safeTransfer(to, units);
        if (souli.balanceOf(address(this)) != beforeSale - units || souli.balanceOf(to) != beforeTo + units
            || souli.balanceOf(address(this)) < inventoryUnits + lpReserveUnits) revert UnexpectedTransfer();
    }
    function renounceOwnership() public override onlyOwner { revert RenounceDisabled(); }
    receive() external payable {
        if (!finalizing || msg.sender != address(router)) revert DirectPaymentDisabled();
    }
    fallback() external payable { revert DirectPaymentDisabled(); }
}
