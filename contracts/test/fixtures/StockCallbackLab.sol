// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;
import {TestToken} from "./TestTokens.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SouliThreeWalletControllerV2} from "../../src/SouliThreeWalletControllerV2.sol";

// Hostile token/authorized contract-operator pair, disposable local tests only.
contract StockCallbackToken is TestToken {
    function transferFrom(address from,address to,uint256 value) public override returns(bool) {
        if(callback!=address(0)){(bool ok,)=callback.call(callbackData);callbackSucceeded=ok;}
        return super.transferFrom(from,to,value);
    }
}
contract StockCallbackOperator {
    SouliThreeWalletControllerV2 public target;
    uint256 public attempts;
    uint256 public successes;
    uint256 public guardRejections;
    function deposit(SouliThreeWalletControllerV2 shop,uint256 quantity) external {
        target=shop;
        IERC20(address(shop.token())).approve(address(shop),quantity*1e9);
        shop.depositStock(quantity);
    }
    function recover(SouliThreeWalletControllerV2 shop,uint256 quantity) external {
        target=shop;shop.recoverInventory(quantity);
    }
    function reenter() external {
        bytes[4] memory calls=[abi.encodeCall(target.depositStock,(1)),abi.encodeCall(target.recoverInventory,(1)),abi.encodeCall(target.recoverHeldTokens,()),abi.encodeCall(target.collectProceeds,())];
        for(uint256 i;i<4;i++){
            attempts++;
            (bool ok,bytes memory result)=address(target).call(calls[i]);
            if(ok)successes++;
            if(!ok&&result.length>=4&&bytes4(result)==bytes4(keccak256("ReentrancyGuardReentrantCall()")))guardRejections++;
        }
    }
    receive() external payable {}
}
