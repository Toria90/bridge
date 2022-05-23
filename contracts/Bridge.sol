pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IERC20MintBurn.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IBridge.sol";

contract Bridge is IBridge, AccessControl {
    using ECDSA for bytes32;
    address public token;
    uint256 public chainId;
    address private _validator;

    mapping(bytes32 => bool) public swaps;
    mapping(uint256 => bool) public chains;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(uint256 _chainId, address _token, address validator){
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(ADMIN_ROLE, _msgSender());
        
        token = _token;
        _validator = validator;
        chainId = _chainId;
    }
    
    function enableChain(uint256 chain) public onlyRole(ADMIN_ROLE) {
        chains[chain] = true;
    }

    function disableChain(uint256 chain) public onlyRole(ADMIN_ROLE) {
        delete chains[chain];
    }
    
    function getChainStatus(uint256 chain) public view returns(bool){
        return chains[chain];
    }
    
    function swap(uint256 nonce, uint256 amount, uint256 toChain, address recipient) public {
        require(toChain != chainId, "invalid toChain id");
        require(chains[toChain], "toChain id not supported");
        require(IERC20MintBurn(token).balanceOf(msg.sender)>=amount, "balance less than amount");
        
        bytes32 swapId = keccak256(abi.encodePacked(msg.sender, nonce, chainId, toChain));
        require(swaps[swapId] == false, "duplicate transaction nonce");

        swaps[swapId] = true;
        IERC20MintBurn(token).burn(msg.sender, amount);

        emit SwapInitialized(swapId, chainId, toChain, msg.sender, amount, nonce, recipient);
    }
    
    function redeem(bytes32 swapId, uint256 amount, address recipient, bytes memory sign) public {

        bytes32 msgHash = keccak256(abi.encodePacked(swapId, amount, recipient));
        require(_validSignature(sign, msgHash), "invalid signature");
        
        require(swaps[swapId] == false, "duplicate redeem");

        swaps[swapId] = true;
        IERC20MintBurn(token).mint(recipient, amount);
        
        emit SwapRedeemed(swapId);
    }

    function _validSignature(bytes memory sign, bytes32 msgHash) internal view returns (bool) {
        return msgHash.toEthSignedMessageHash().recover(sign) == _validator;
    }
}
