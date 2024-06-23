// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        require(token.transfer(to, value), "SafeERC20: transfer failed");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        require(token.transferFrom(from, to, value), "SafeERC20: transferFrom failed");
    }
}

contract UniswapSell {
    using SafeERC20 for IERC20;

    IUniswapV2Pair public pair;
    
    struct Seller {
        address addr;
        uint256 amount;
    }
    
    Seller[] public token0Sellers;
    Seller[] public token1Sellers;
    
    uint256 public totalToken0In;
    uint256 public totalToken1In;

    constructor(address _pairAddress) {
        pair = IUniswapV2Pair(_pairAddress);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function sell_token0(uint256 amountIn) external {
        address token0 = pair.token0();
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amountIn);
        token0Sellers.push(Seller(msg.sender, amountIn));
        totalToken0In += amountIn;
    }

    function sell_token1(uint256 amountIn) external {
        address token1 = pair.token1();
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amountIn);
        token1Sellers.push(Seller(msg.sender, amountIn));
        totalToken1In += amountIn;
    }

    function execute() external {
        address token0 = pair.token0();
        address token1 = pair.token1();
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();

        uint amount0Out = 0;
        uint amount1Out = 0;
        
        if (totalToken0In > 0) {
            amount1Out = getAmountOut(totalToken0In, reserve0, reserve1);
        }
        if (totalToken1In > 0) {
            amount0Out = getAmountOut(totalToken1In, reserve1, reserve0);
        }

        if (totalToken0In > 0) {
            IERC20(token0).safeTransfer(address(pair), totalToken0In);
        }
        if (totalToken1In > 0) {
            IERC20(token1).safeTransfer(address(pair), totalToken1In);
        }

        pair.swap(amount0Out, amount1Out, address(this), "");

        distributeFunds();

        totalToken0In = 0;
        totalToken1In = 0;
    }

    function distributeFunds() internal {
        address token0 = pair.token0();
        address token1 = pair.token1();
        uint256 totalOutput0 = IERC20(token0).balanceOf(address(this));
        uint256 totalOutput1 = IERC20(token1).balanceOf(address(this));

        for (uint i = 0; i < token0Sellers.length; i++) {
            Seller memory seller = token0Sellers[i];
            uint256 share = (seller.amount * totalOutput1) / totalToken0In;
            IERC20(token1).safeTransfer(seller.addr, share);
        }

        for (uint i = 0; i < token1Sellers.length; i++) {
            Seller memory seller = token1Sellers[i];
            uint256 share = (seller.amount * totalOutput0) / totalToken1In;
            IERC20(token0).safeTransfer(seller.addr, share);
        }

        delete token0Sellers;
        delete token1Sellers;
    }
}
