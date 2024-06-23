import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { ethers } from 'ethers';

const ERC20_ABI = [
  "function mint(address to, uint256 amount) public",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)"
];

const UNISWAP_SELL_ABI = [
  "function sell_token0(uint256 amountIn) external",
  "function sell_token1(uint256 amountIn) external",
  "function execute() external"
];

const config = {
  token0: { address: '0xA854C1bC1aEcC80094E2ac3C0EE98581460F1caD', decimals: 18 },
  token1: { address: '0xF997350F2Ea6fCB6d5CD7366F4836958CCc74460', decimals: 6 },
  pairAddress: '0xdE18780E8940631148580b8Cf84e579F704430fD',
  contractAddress: '0x3ff0fEeCf3aD3b79480018d165dbD401995A0376'
};

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [token0Contract, setToken0Contract] = useState(null);
  const [token1Contract, setToken1Contract] = useState(null);
  const [sellContract, setSellContract] = useState(null);
  const [sellAmount, setSellAmount] = useState('');

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);

        try {
          await window.ethereum.enable();
          const accounts = await web3Instance.eth.getAccounts();
          setAccount(accounts[0]);

          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();

          setToken0Contract(new ethers.Contract(config.token0.address, ERC20_ABI, signer));
          setToken1Contract(new ethers.Contract(config.token1.address, ERC20_ABI, signer));
          setSellContract(new ethers.Contract(config.contractAddress, UNISWAP_SELL_ABI, signer));
        } catch (error) {
          console.error("User denied account access");
        }
      } else {
        console.log('Please install MetaMask!');
      }
    };

    init();
  }, []);

  const mintTokens = async (tokenContract, decimals) => {
    try {
      const amount = ethers.utils.parseUnits('100', decimals);
      await tokenContract.mint(account, amount);
      alert('Minted 100 tokens successfully!');
    } catch (error) {
      console.error('Error minting tokens:', error);
    }
  };

  const approveMaxTokens = async (tokenContract) => {
    try {
      const maxUint256 = ethers.constants.MaxUint256;
      await tokenContract.approve(config.contractAddress, maxUint256);
      alert('Approved maximum amount of tokens successfully!');
    } catch (error) {
      console.error('Error approving tokens:', error);
    }
  };

  const sellTokens = async (tokenContract, sellTokenFunction, decimals) => {
    try {
      const amount = ethers.utils.parseUnits(sellAmount, decimals);
      await sellTokenFunction(amount);
      alert('Tokens sold successfully!');
    } catch (error) {
      console.error('Error selling tokens:', error);
    }
  };

  const executeSwap = async () => {
    try {
      await sellContract.execute();
      alert('Swap executed successfully!');
    } catch (error) {
      console.error('Error executing swap:', error);
    }
  };

  if (!web3) {
    return <div>Loading Web3, accounts, and contract...</div>;
  }

  return (
    <div className="App">
      <h1>Uniswap Sell Interface</h1>
      <p>Your account: {account}</p>
      <button onClick={() => mintTokens(token0Contract, config.token0.decimals)}>Mint 100 Token0</button>
      <button onClick={() => mintTokens(token1Contract, config.token1.decimals)}>Mint 100 Token1</button>
      <br /><br />
      <button onClick={() => approveMaxTokens(token0Contract)}>Approve Max Token0</button>
      <button onClick={() => approveMaxTokens(token1Contract)}>Approve Max Token1</button>
      <br /><br />
      <input 
        type="text" 
        value={sellAmount} 
        onChange={(e) => setSellAmount(e.target.value)} 
        placeholder="Amount to sell" 
      />
      <button onClick={() => sellTokens(token0Contract, sellContract.sell_token0, config.token0.decimals)}>Sell Token0</button>
      <button onClick={() => sellTokens(token1Contract, sellContract.sell_token1, config.token1.decimals)}>Sell Token1</button>
      <br /><br />
      <button onClick={executeSwap}>Execute Swap</button>
    </div>
  );
}

export default App;
