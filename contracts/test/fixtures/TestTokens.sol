// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    bool public failTransfers;
    bool public fee;
    address public callback;
    bytes public callbackData;
    bool public callbackSucceeded;
    constructor() ERC20("Test SOULI - no value", "TEST") { _mint(msg.sender, 210_000_000 * 1e9); }
    function decimals() public pure override returns (uint8) { return 9; }
    function setFailure(bool value) external { failTransfers = value; }
    function setFee(bool value) external { fee = value; }
    function setCallback(address target, bytes calldata data) external {callback=target;callbackData=data;}
    function transfer(address to,uint256 value) public override returns(bool) {
        require(!failTransfers,"Test transfer failed");
        if(callback!=address(0)){(bool ok,)=callback.call(callbackData);callbackSucceeded=ok;}
        if(fee){super.transfer(to,value-1);super.transfer(address(0xdead),1);return true;}
        return super.transfer(to,value);
    }
}
contract WrongDecimals is ERC20 { constructor() ERC20("Wrong", "WRONG") {} }
contract RejectTreasury {
    function withdraw(address sale) external {(bool ok,)=sale.call(abi.encodeWithSignature("withdrawProceeds()"));require(ok);}
    receive() external payable {revert("Reject ETH");}
}
// Adversarial receiver for local tests only; not a production wallet.
contract ReentrantTreasury {
    address public sale;
    bool public callbackSucceeded;
    function withdraw(address target) external {
        sale = target;
        (bool ok,) = target.call(abi.encodeWithSignature("withdrawProceeds()"));
        require(ok);
    }
    receive() external payable {
        (bool ok,) = sale.call(abi.encodeWithSignature("withdrawProceeds()"));
        callbackSucceeded = ok;
    }
}
