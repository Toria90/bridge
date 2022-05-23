pragma solidity ^0.8.0;

/// @title A simple Bridge between eth blockchains
/// @author Victoria Dolzhenko
/// @notice You can use this contract for swap your tokens from one chain to other
/// @dev 
interface IBridge {
    /// @notice Enable some chain Id. Now your users can send his tokens to this chain.@author
    /// can use only admin role
    /// @param chain Enabled chain id
    function enableChain(uint256 chain) external;

    /// @notice Disable some chain Id. Now your users can't send his tokens to this chain
    /// can use only admin role
    /// @param chain Disabled chain id
    function disableChain(uint256 chain) external;

    /// @notice Gets Information about enable/disable chain id
    /// @param chain Chain id
    function getChainStatus(uint256 chain) external view returns(bool);

    /// @notice This function burn user tokens and send event about swap
    /// @param nonce Transaction id. Should be unique for sender
    /// @param amount Amount of tokens which you want to swap
    /// @param toChain Chain Id where you send the transaction
    /// @param recipient Recipient address
    function swap(uint256 nonce, uint256 amount, uint256 toChain, address recipient)  external;

    /// @notice This function need to get tokens from toChain. It mints tokens
    /// @param swapId Transaction id.
    /// @param amount Amount of tokens which you want to swap
    /// @param recipient Recipient address
    /// @param sign Signature
    function redeem(bytes32 swapId, uint256 amount, address recipient, bytes memory sign) external;

    event SwapInitialized(
        bytes32 swapId,
        uint256 fromChain,
        uint256 toChain,
        address indexed sender,
        uint256 amount,
        uint256 nonce,
        address recipient
    );

    event SwapRedeemed(
        bytes32 swapId
    );
}