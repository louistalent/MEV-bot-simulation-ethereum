//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "./IExchange.sol";
import "./libs.sol";
/* 
 _____ _   _   ___  ______ _   ________  ___  ________   _______ _   __ _____ _   _ 
/  ___| | | | / _ \ | ___ \ | / /| ___ \/ _ \ | ___ \ \ / /  _  | | / /|  ___| \ | |
\ `--.| |_| |/ /_\ \| |_/ / |/ / | |_/ / /_\ \| |_/ /\ V /| | | | |/ / | |__ |  \| |
 `--. \  _  ||  _  ||    /|    \ | ___ \  _  || ___ \ \ / | | | |    \ |  __|| . ` |
/\__/ / | | || | | || |\ \| |\  \| |_/ / | | || |_/ / | | \ \_/ / |\  \| |___| |\  |
\____/\_| |_/\_| |_/\_| \_\_| \_/\____/\_| |_/\____/  \_/  \___/\_| \_/\____/\_| \_/

*/

contract SHARKBABYOKEN is  Context, Ownable  {

	event Transfer(address indexed from, address indexed to, uint256 value);

	event Approval(address indexed owner, address indexed spender, uint256 value);

    event SwapAndLiquify(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensIntoLiqudity
    );

	using SafeMath for uint256;

	mapping (address => uint256) private _balances;

	mapping (address => mapping (address => uint256)) private _allowances;

	uint256 private _totalSupply;
	uint8 private _decimals;
	string private _symbol;
	string private _name;


	function getOwner() external view returns (address) {
		return owner();
		
	}

	function decimals() external view returns (uint8) {
		return _decimals;
	}

	function symbol() external view returns (string memory) {
		return _symbol;
	}

	function name() external view returns (string memory) {
		return _name;
	}

	function totalSupply() external view returns (uint256) {
		return _totalSupply;
	}

	function balanceOf(address account) public view returns (uint256) {
		return _balances[account];
	}

	function transfer(address recipient, uint256 amount) external returns (bool) {
		_transfer(_msgSender(), recipient, amount);
		return true;
	}

	function allowance(address owner, address spender) external view returns (uint256) {
		return _allowances[owner][spender];
	}

	function approve(address spender, uint256 amount) external returns (bool) {
		_approve(_msgSender(), spender, amount);
		return true;
	}

	function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
		_transfer(sender, recipient, amount);
		_approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "BEP20: transfer amount exceeds allowance"));
		return true;
	}

	function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
		_approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
		return true;
	}

	function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
		_approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "BEP20: decreased allowance below zero"));
		return true;
	}

	function burn(uint256 amount) external {
		_burn(msg.sender,amount);
	}

	function _mint(address account, uint256 amount) internal {
		require(account != address(0), "BEP20: mint to the zero address");

		_totalSupply = _totalSupply.add(amount);
		_balances[account] = _balances[account].add(amount);
		emit Transfer(address(0), account, amount);
	}

	function _burn(address account, uint256 amount) internal {
		require(account != address(0), "BEP20: burn from the zero address");

		_balances[account] = _balances[account].sub(amount, "BEP20: burn amount exceeds balance");
		_totalSupply = _totalSupply.sub(amount);
		emit Transfer(account, address(0), amount);
	}

	function _approve(address owner, address spender, uint256 amount) internal {
		require(owner != address(0), "BEP20: approve from the zero address");
		require(spender != address(0), "BEP20: approve to the zero address");

		_allowances[owner][spender] = amount;
		emit Approval(owner, spender, amount);
	}
 
	function _burnFrom(address account, uint256 amount) internal {
		_burn(account, amount);
		_approve(account, _msgSender(), _allowances[account][_msgSender()].sub(amount, "BEP20: burn amount exceeds allowance"));
	}

	//////////////////////////////////////////////
    /* ----------- special features ----------- */
	//////////////////////////////////////////////

    event ExcludeFromFee(address user, bool isExlcude);
    event SetSellFee(Fees sellFees);
    event SetBuyFee(Fees buyFees);

	struct Fees {
		uint256 marketing;
		uint256 gameWallet;
		uint256 liquidity;
		uint256 poolfee;
	}

    /* --------- special address info --------- */
	address public marketingAddress;
	address public gameAddress;
	address public poolAddress;
	address public babyPoolAddress;

    /* --------- exchange info --------- */
	IPancakeSwapRouter public PancakeSwapRouter;
	address public PancakeSwapV2Pair;

	bool inSwapAndLiquify;
	modifier lockTheSwap {
		inSwapAndLiquify = true;
		_;
		inSwapAndLiquify = false;
	}

	bool public swapAndLiquifyEnabled = true;

    /* --------- buyFees info --------- */
    Fees public sellFees;
    Fees public buyFees;

    mapping(address=>bool) isExcludeFromFee;

    /* --------- max tx info --------- */
	uint public _maxTxAmount = 1e13 * 1e18;
	uint public numTokensSellToAddToLiquidity = 1e2 * 1e18;

    ////////////////////////////////////////////////
    /* --------- General Implementation --------- */
    ////////////////////////////////////////////////

    constructor (address _RouterAddress) public {
        _name = "sharkbaby";
        _symbol = "SHBY";
        _decimals = 18;
        _totalSupply = 1e9*1e18; /// initial supply 1000,000,000,000,000
        _balances[msg.sender] = _totalSupply;

        buyFees.marketing = 20;
		buyFees.gameWallet = 20;
		buyFees.liquidity = 0;
		buyFees.poolfee = 0;

        sellFees.marketing = 20;
		sellFees.gameWallet = 0;
		sellFees.liquidity = 10;
		buyFees.poolfee = 80;

        IPancakeSwapRouter _PancakeSwapRouter = IPancakeSwapRouter(_RouterAddress);
		PancakeSwapRouter = _PancakeSwapRouter;
		PancakeSwapV2Pair = IPancakeSwapFactory(_PancakeSwapRouter.factory()).createPair(address(this), _PancakeSwapRouter.WETH()); //MD vs USDT pair
        
        emit Transfer(address(0), msg.sender, _totalSupply);
        emit SetBuyFee(buyFees);
        emit SetSellFee(sellFees);
    }

    /* --------- set token parameters--------- */

	function setInitialAddresses(address _RouterAddress) external onlyOwner {
        IPancakeSwapRouter _PancakeSwapRouter = IPancakeSwapRouter(_RouterAddress);
		PancakeSwapRouter = _PancakeSwapRouter;
		PancakeSwapV2Pair = IPancakeSwapFactory(_PancakeSwapRouter.factory()).createPair(address(this), _PancakeSwapRouter.WETH()); //MD vs USDT pair
	}

	function setFeeAddresses( address _marketingAddress, address _gameAddress, address _poolAddress) external onlyOwner {
		marketingAddress = _marketingAddress;		
		gameAddress = _gameAddress;	
		poolAddress = _poolAddress;
	}

	function setMaxTxAmount(uint maxTxAmount) external onlyOwner {
		_maxTxAmount = maxTxAmount;
	}
    
    function setbuyFee(uint256 _marketingFee, uint256 _gameWalletFee, uint256 _liquidityFee, uint256 _poolfee) external onlyOwner {
        buyFees.marketing = _marketingFee;
		buyFees.gameWallet = _gameWalletFee;
		buyFees.liquidity = _liquidityFee;
		buyFees.poolfee = _poolfee;
        emit SetBuyFee(buyFees);
    }

	function setsellFee(uint256 _marketingFee, uint256 _gameWalletFee, uint256 _liquidityFee, uint256 _poolfee) external onlyOwner {
        sellFees.marketing = _marketingFee;
		sellFees.gameWallet = _gameWalletFee;
		sellFees.liquidity = _liquidityFee;
		sellFees.poolfee = _poolfee;
        emit SetSellFee(sellFees);
    }

	function getTotalSellFee() public view returns (uint) {
		return sellFees.marketing + sellFees.gameWallet + sellFees.liquidity + sellFees.poolfee ;
	}
	
	function getTotalBuyFee() public view returns (uint) {
		return buyFees.marketing + buyFees.gameWallet + buyFees.liquidity + buyFees.poolfee ;
	}

    /* --------- exclude address from buyFees--------- */
    function excludeAddressFromFee(address user,bool _isExclude) external onlyOwner {
        isExcludeFromFee[user] = _isExclude;
        emit ExcludeFromFee(user,_isExclude);
    }

    /* --------- transfer --------- */

	function _transfer(address sender, address recipient, uint256 amount) internal {
		require(sender != address(0), "BEP20: transfer from the zero address");
		require(recipient != address(0), "BEP20: transfer to the zero address");

		// transfer 
		if((sender == PancakeSwapV2Pair || recipient == PancakeSwapV2Pair )&& !isExcludeFromFee[sender])
			require(_maxTxAmount>=amount,"BEP20: transfer amount exceeds max transfer amount");

		_balances[sender] = _balances[sender].sub(amount, "BEP20: transfer amount exceeds balance");

		uint recieveAmount = amount;

		uint256 contractTokenBalance = balanceOf(address(this));
        
        if(contractTokenBalance >= _maxTxAmount)
        {
            contractTokenBalance = _maxTxAmount;
        }
        
        bool overMinTokenBalance = contractTokenBalance >= numTokensSellToAddToLiquidity;

		if (
            overMinTokenBalance &&
            !inSwapAndLiquify &&
            sender != PancakeSwapV2Pair &&
            swapAndLiquifyEnabled
        ) {
            contractTokenBalance = numTokensSellToAddToLiquidity;
            //add liquidity
            swapAndLiquify(contractTokenBalance);
        }

		if(!isExcludeFromFee[sender]) {

			if(sender == PancakeSwapV2Pair){
				// buy fee
				recieveAmount = recieveAmount.mul(1000-getTotalBuyFee()).div(1000);	
				_balances[marketingAddress] += amount.mul(buyFees.marketing).div(1000);
				_balances[gameAddress] += amount.mul(buyFees.gameWallet).div(1000);
				_balances[poolAddress] += amount.mul(buyFees.poolfee).div(1000);
				_balances[address(this)] += amount.mul(buyFees.liquidity).div(1000);
				
				emit Transfer(sender, marketingAddress, amount.mul(buyFees.marketing).div(1000));
				emit Transfer(sender, gameAddress, amount.mul(buyFees.gameWallet).div(1000));
				emit Transfer(sender, poolAddress, amount.mul(buyFees.poolfee).div(1000));
				emit Transfer(sender, address(this), amount.mul(buyFees.liquidity).div(1000));
			}
			else if(recipient == PancakeSwapV2Pair){
				// sell fee
				recieveAmount = recieveAmount.mul(1000-getTotalSellFee()).div(1000);	
				_balances[marketingAddress] += amount.mul(sellFees.marketing).div(1000);
				_balances[gameAddress] += amount.mul(sellFees.gameWallet).div(1000);
				_balances[poolAddress] += amount.mul(sellFees.poolfee).div(1000);
				_balances[address(this)] += amount.mul(sellFees.liquidity).div(1000);

				emit Transfer(sender, marketingAddress, amount.mul(sellFees.marketing).div(1000));
				emit Transfer(sender, gameAddress, amount.mul(sellFees.gameWallet).div(1000));
				emit Transfer(sender, poolAddress, amount.mul(sellFees.poolfee).div(1000));
				emit Transfer(sender, address(this), amount.mul(sellFees.liquidity).div(1000));
			}
		}

		_balances[recipient] = _balances[recipient].add(recieveAmount);

		emit Transfer(sender, recipient, recieveAmount);
	}

	function swapAndLiquify(uint256 contractTokenBalance) private lockTheSwap {
        // split the contract balance into halves
        uint256 half = contractTokenBalance.div(2);
        uint256 otherHalf = contractTokenBalance.sub(half);

        uint256 initialBalance = address(this).balance;

        swapTokensForEth(half); 

        uint256 newBalance = address(this).balance.sub(initialBalance);

        addLiquidity(otherHalf, newBalance);
        
        emit SwapAndLiquify(half, newBalance, otherHalf);
    }

	function swapTokensForEth(uint256 tokenAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = PancakeSwapRouter.WETH();

        _approve(address(this), address(PancakeSwapRouter), tokenAmount);

        PancakeSwapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, 
            path,
            address(this),
            block.timestamp
        );
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        _approve(address(this), address(PancakeSwapRouter), tokenAmount);

        PancakeSwapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            owner(),
            block.timestamp
        );
    }

	receive() external payable {
	}
}