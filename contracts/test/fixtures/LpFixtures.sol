// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;
// LOCAL ADVERSARIAL DOUBLES ONLY. Real DEX behavior is tested separately on a Base fork.
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract LpTestWeth is ERC20 {
    constructor() ERC20("Local WETH", "WETH") {}
    function deposit() external payable { _mint(msg.sender, msg.value); }
}
contract LpTestPair is ERC20 {
    address public immutable token0;
    address public immutable token1;
    uint112 private r0;
    uint112 private r1;
    uint256 public mintMode;
    constructor(address a, address b) ERC20("Local LP", "TESTLP") { token0 = a; token1 = b; }
    function getReserves() external view returns(uint112,uint112,uint32) {return (r0,r1,uint32(block.timestamp));}
    function setMintMode(uint256 mode) external {mintMode=mode;}
    function sync() public {r0 = uint112(IERC20(token0).balanceOf(address(this))); r1 = uint112(IERC20(token1).balanceOf(address(this)));}
    function skim(address to) external {
        IERC20(token0).transfer(to, IERC20(token0).balanceOf(address(this)) - r0);
        IERC20(token1).transfer(to, IERC20(token1).balanceOf(address(this)) - r1);
    }
    function mint(address to) external returns(uint256 liquidity) {
        require(mintMode!=1,"MINT_FAILURE");
        uint256 a = IERC20(token0).balanceOf(address(this)) - r0;
        uint256 b = IERC20(token1).balanceOf(address(this)) - r1;
        if (totalSupply() == 0) {liquidity = Math.sqrt(a*b)-1000; _mint(address(0xdead),1000);}
        else liquidity = Math.min(a*totalSupply()/r0,b*totalSupply()/r1);
        require(liquidity > 0);
        _mint(mintMode==2?address(this):to,mintMode==4?1:liquidity); sync();
        if(mintMode==3)liquidity+=1;
    }
}
contract LpTestFactory {
    mapping(address=>mapping(address=>address)) public getPair;
    function createPair(address a, address b) external returns(address p) {
        require(getPair[a][b] == address(0)); p = address(new LpTestPair(a,b));
        getPair[a][b]=p; getPair[b][a]=p;
    }
}
contract LpTestRouter {
    address public immutable factory;
    address public immutable WETH;
    uint256 public mode;
    bool public callbackSucceeded;
    constructor(address f, address w) {factory=f;WETH=w;}
    function setMode(uint256 m) external { mode=m; }
    function addLiquidityETH(address token,uint256 desired,uint256 minToken,uint256 minEth,address to,uint256 deadline)
        external payable returns(uint256 a,uint256 b,uint256 lp) {
        require(mode != 1,"ROUTER_FAILURE"); require(block.timestamp<=deadline);
        address p=LpTestFactory(factory).getPair(token,WETH);
        (uint256 rt,uint256 re,)=LpTestPair(p).getReserves();
        a=desired; b=msg.value;
        if(rt!=0||re!=0){uint256 ethOptimal=a*re/rt;if(ethOptimal<=b)b=ethOptimal;else a=b*rt/re;}
        if(mode==3){a=a/2;b=b/2;} // deliberately ignore min parameters
        else {require(a>=minToken&&b>=minEth,"MINIMUM");}
        if(mode==6)(callbackSucceeded,)=msg.sender.call(abi.encodeWithSignature("finalize()"));
        IERC20(token).transferFrom(msg.sender,p,mode==5?a+1:a);
        LpTestWeth(WETH).deposit{value:b}(); IERC20(WETH).transfer(p,b);
        lp=LpTestPair(p).mint(mode==2?address(this):to);
        if(msg.value>b){(bool ok,)=msg.sender.call{value:msg.value-b}("");require(ok);}
        if(mode==4)lp+=1;
    }
}
contract LpForceEth {
    constructor(address payable to) payable {selfdestruct(to);}
}
