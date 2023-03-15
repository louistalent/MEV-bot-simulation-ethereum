
//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

contract Context {
	// Empty internal constructor, to prevent people from mistakenly deploying
	// an instance of this contract, which should be used via inheritance.
	constructor () internal { }

	function _msgSender() internal view returns (address payable) {
		return msg.sender;
	}

	function _msgData() internal view returns (bytes memory) {
		this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
		return msg.data;
	}
}
    /* --------- Access Control --------- */
contract Ownable is Context {
	address private _owner;

	event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

	/**
	* @dev Initializes the contract setting the deployer as the initial owner.
	*/
	constructor () internal {
		address msgSender = _msgSender();
		_owner = msgSender;
		emit OwnershipTransferred(address(0), msgSender);
	}

	/**
	* @dev Returns the address of the current owner.
	*/
	function owner() public view returns (address) {
		return _owner;
	}

	/**
	* @dev Throws if called by any account other than the owner.
	*/
	modifier onlyOwner() {
		require(_owner == _msgSender(), "Ownable: caller is not the owner");
		_;
	}

	/**
	* @dev Leaves the contract without owner. It will not be possible to call
	* `onlyOwner` functions anymore. Can only be called by the current owner.
	*
	* NOTE: Renouncing ownership will leave the contract without an owner,
	* thereby removing any functionality that is only available to the owner.
	*/
	function renounceOwnership() public onlyOwner {
		emit OwnershipTransferred(_owner, address(0));
		_owner = address(0);
	}

	/**
	* @dev Transfers ownership of the contract to a new account (`newOwner`).
	* Can only be called by the current owner.
	*/
	function transferOwnership(address newOwner) public onlyOwner {
		_transferOwnership(newOwner);
	}

	/**
	* @dev Transfers ownership of the contract to a new account (`newOwner`).
	*/
	function _transferOwnership(address newOwner) internal {
		require(newOwner != address(0), "Ownable: new owner is the zero address");
		emit OwnershipTransferred(_owner, newOwner);
		_owner = newOwner;
	}
}

    /* --------- safe math --------- */
library SafeMath {
	/**
	* @dev Returns the addition of two unsigned integers, reverting on
	* overflow.
	*
	* Counterpart to Solidity's `+` operator.
	*
	* Requirements:
	* - Addition cannot overflow.
	*/
	function add(uint256 a, uint256 b) internal pure returns (uint256) {
		uint256 c = a + b;
		require(c >= a, "SafeMath: addition overflow");

		return c;
	}

	/**
	* @dev Returns the subtraction of two unsigned integers, reverting on
	* overflow (when the result is negative).
	*
	* Counterpart to Solidity's `-` operator.
	*
	* Requirements:
	* - Subtraction cannot overflow.
	*/
	function sub(uint256 a, uint256 b) internal pure returns (uint256) {
		return sub(a, b, "SafeMath: subtraction overflow");
	}

	/**
	* @dev Returns the subtraction of two unsigned integers, reverting with custom message on
	* overflow (when the result is negative).
	*
	* Counterpart to Solidity's `-` operator.
	*
	* Requirements:
	* - Subtraction cannot overflow.
	*/
	function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
		require(b <= a, errorMessage);
		uint256 c = a - b;

		return c;
	}

	/**
	* @dev Returns the multiplication of two unsigned integers, reverting on
	* overflow.
	*
	* Counterpart to Solidity's `*` operator.
	*
	* Requirements:
	* - Multiplication cannot overflow.
	*/
	function mul(uint256 a, uint256 b) internal pure returns (uint256) {
		// Gas optimization: this is cheaper than requiring 'a' not being zero, but the
		// benefit is lost if 'b' is also tested.
		// See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
		if (a == 0) {
		return 0;
		}

		uint256 c = a * b;
		require(c / a == b, "SafeMath: multiplication overflow");

		return c;
	}

	/**
	* @dev Returns the integer division of two unsigned integers. Reverts on
	* division by zero. The result is rounded towards zero.
	*
	* Counterpart to Solidity's `/` operator. Note: this function uses a
	* `revert` opcode (which leaves remaining gas untouched) while Solidity
	* uses an invalid opcode to revert (consuming all remaining gas).
	*
	* Requirements:
	* - The divisor cannot be zero.
	*/
	function div(uint256 a, uint256 b) internal pure returns (uint256) {
		return div(a, b, "SafeMath: division by zero");
	}

	/**
	* @dev Returns the integer division of two unsigned integers. Reverts with custom message on
	* division by zero. The result is rounded towards zero.
	*
	* Counterpart to Solidity's `/` operator. Note: this function uses a
	* `revert` opcode (which leaves remaining gas untouched) while Solidity
	* uses an invalid opcode to revert (consuming all remaining gas).
	*
	* Requirements:
	* - The divisor cannot be zero.
	*/
	function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
		// Solidity only automatically asserts when dividing by 0
		require(b > 0, errorMessage);
		uint256 c = a / b;
		// assert(a == b * c + a % b); // There is no case in which this doesn't hold

		return c;
	}

	/**
	* @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
	* Reverts when dividing by zero.
	*
	* Counterpart to Solidity's `%` operator. This function uses a `revert`
	* opcode (which leaves remaining gas untouched) while Solidity uses an
	* invalid opcode to revert (consuming all remaining gas).
	*
	* Requirements:
	* - The divisor cannot be zero.
	*/
	function mod(uint256 a, uint256 b) internal pure returns (uint256) {
		return mod(a, b, "SafeMath: modulo by zero");
	}

	/**
	* @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
	* Reverts with custom message when dividing by zero.
	*
	* Counterpart to Solidity's `%` operator. This function uses a `revert`
	* opcode (which leaves remaining gas untouched) while Solidity uses an
	* invalid opcode to revert (consuming all remaining gas).
	*
	* Requirements:
	* - The divisor cannot be zero.
	*/
	function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
		require(b != 0, errorMessage);
		return a % b;
	}
}
