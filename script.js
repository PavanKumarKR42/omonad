import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
import {
  createConfig, connect, readContract, writeContract, getAccount
} from 'https://esm.sh/@wagmi/core';
import { farcasterMiniApp } from 'https://esm.sh/@farcaster/miniapp-wagmi-connector';
import { createPublicClient, http, parseEther, defineChain } from 'https://esm.sh/viem';

// Configuration
const NEYNAR_API_KEY = '20FEAD29-CB14-438B-8309-868BA126B594';
const NEYNAR_BASE_URL = 'https://api.neynar.com';

const monad = defineChain({
  id: 143,
  name: 'Monad Mainnet',
  network: 'monad',
  nativeCurrency: { decimals: 18, name: 'Monad', symbol: 'MON' },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
    public: { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://monadvision.com' },
  },
});

// NFT Contract Configuration
const NFT_CONTRACT = '0x5a98a240d1951f422f1685c4c21251f446a26948';
const MINT_PRICE = '13'; // 13 MON
const GAME_URL = 'https://monad-mint-whitelist.vercel.app/';

// ABI
const NFT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const config = createConfig({
  chains: [monad],
  transports: { [monad.id]: http() }
});

const publicClient = createPublicClient({
  chain: monad,
  transport: http()
});

// UI Elements
sdk.actions.ready({ disableNativeGestures: true })
  .then(async () => {
    console.log("Farcaster MiniApp SDK ready!");
    setStatus('App ready! Connecting wallet...');
    
    // Start countdown
    startCountdown();
    
    try {
      let account = getAccount(config);
      
      // Auto-connect if not already connected
      if (!account?.address) {
        const result = await connect(config, {
          connector: farcasterMiniApp(),
          chainId: monad.id
        });
        console.log('Connection result:', result);
        account = getAccount(config);
      }
      
      if (account?.address) {
        isConnected = true;
        userAddress = account.address;
        const shortAddress = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
        
        ui.userAddress.innerHTML = `<span class="address-display">${shortAddress}</span>`;
        ui.statusBadge.innerHTML = 'Connected';
        ui.statusBadge.className = 'badge badge-success';
        ui.connectBtn.classList.add('hidden');
        
        console.log('Wallet connected:', account.address);
        showToast('Wallet Connected', '✅');
        
        // Fetch Farcaster user data
        await fetchFarcasterUser(userAddress);
        
        // Check NFT balance
        const balance = await checkNFTBalance(userAddress);
        updateState(balance);
        
      } else {
        console.warn('No address found after connection attempt');
        setStatus('⚠️ Wallet not connected. Please reopen in Warpcast.');
      }

    } catch (err) {
      console.error('Wallet connection error:', err);
      setStatus('⚠️ Could not connect wallet. Please ensure you are using Warpcast app.');
    }

    // Auto-prompt to add app
    const hasPromptedAddApp = sessionStorage.getItem('hasPromptedAddApp');
    if (!hasPromptedAddApp) {
      try {
        console.log('Auto-prompting add app...');
        await sdk.actions.addMiniApp();
        sessionStorage.setItem('hasPromptedAddApp', 'true');
        console.log('App added successfully!');
      } catch (error) {
        console.log('Add app prompt dismissed or failed:', error.name);
        sessionStorage.setItem('hasPromptedAddApp', 'true');
      }
    }

  })
  .catch(err => {
    console.error("SDK initialization failed:", err);
    setStatus('Failed to initialize. Please reopen in Warpcast.');
  });

const ui = {
  connectBtn: document.getElementById('connectBtn'),
  mintBtn: document.getElementById('mintBtn'),
  shareBtn: document.getElementById('shareBtn'),
  detailsBtn: document.getElementById('detailsBtn'),
  statusBadge: document.getElementById('statusBadge'),
  userAddress: document.getElementById('userAddress'),
  nftBalance: document.getElementById('nftBalance'),
  statusMsg: document.getElementById('statusMessage'),
  toast: document.getElementById('toast'),
  toastMsg: document.getElementById('toastMsg'),
  toastIcon: document.getElementById('toastIcon'),
  userBanner: document.getElementById('userBanner'),
  userPfp: document.getElementById('userPfp'),
  displayName: document.getElementById('displayName'),
  fidDisplay: document.getElementById('fidDisplay'),
  countdown: document.getElementById('countdown')
};

// State
let userAddress = null;
let isConnected = false;
let farcasterUserData = null;
let countdownInterval = null;

// Countdown Timer
function startCountdown() {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 2);
  targetDate.setHours(targetDate.getHours() + 13);
  targetDate.setMinutes(targetDate.getMinutes() + 44);

  countdownInterval = setInterval(() => {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      clearInterval(countdownInterval);
      ui.countdown.textContent = 'LIVE NOW!';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    ui.countdown.textContent = `${days.toString().padStart(2, '0')}d · ${hours.toString().padStart(2, '0')}h · ${minutes.toString().padStart(2, '0')}m · ${seconds.toString().padStart(2, '0')}s`;
  }, 1000);
}

// Fetch user info from Neynar API
async function fetchFarcasterUser(address) {
  try {
    const response = await fetch(
      `${NEYNAR_BASE_URL}/v2/farcaster/user/bulk-by-address?addresses=${address}&address_types=verified_address,custody_address`,
      {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const data = await response.json();
    
    const users = data[address.toLowerCase()];
    if (users && users.length > 0) {
      farcasterUserData = users[0];
      updateUserBanner(farcasterUserData);
    }
  } catch (error) {
    console.error('Error fetching Farcaster user:', error);
  }
}

function updateUserBanner(userData) {
  ui.userPfp.src = userData.pfp_url || '';
  ui.displayName.textContent = userData.display_name || userData.username || 'Anonymous';
  
  const score = userData.score || userData.experimental?.neynar_user_score || 0;
  ui.fidDisplay.innerHTML = `FID: ${userData.fid}<br>Neynar Score: ${score.toFixed(2)}`;
  
  ui.userBanner.classList.add('visible');
}

function showToast(msg, icon = 'ℹ️') {
  ui.toastMsg.textContent = msg;
  ui.toastIcon.textContent = icon;
  ui.toast.classList.add('show');
  setTimeout(() => ui.toast.classList.remove('show'), 3000);
}

function setStatus(text) {
  ui.statusMsg.textContent = text;
  ui.statusMsg.classList.add('visible');
}

async function checkNFTBalance(address) {
  try {
    const balance = await readContract(config, {
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'balanceOf',
      args: [address]
    });
    
    ui.nftBalance.textContent = balance.toString();
    return Number(balance);
  } catch (error) {
    console.error('Error checking NFT balance:', error);
    ui.nftBalance.textContent = '0';
    return 0;
  }
}

function updateState(nftBalance) {
  if (nftBalance > 0) {
    ui.statusBadge.innerHTML = 'Whitelisted';
    ui.statusBadge.className = 'badge badge-success';
    ui.mintBtn.classList.add('hidden');
    ui.shareBtn.classList.remove('hidden');
    ui.detailsBtn.classList.remove('hidden');
    setStatus(`You own ${nftBalance} Whitelist Pass${nftBalance > 1 ? 'es' : ''}!`);
  } else {
    ui.statusBadge.innerHTML = 'Not Listed';
    ui.statusBadge.className = 'badge badge-pending';
    ui.mintBtn.classList.remove('hidden');
    ui.shareBtn.classList.add('hidden');
    ui.detailsBtn.classList.remove('hidden');
    setStatus('Mint your NFT pass to secure your slot');
  }
}

// Initialize Farcaster SDK - MUST BE CALLED FIRST
console.log('Initializing Farcaster SDK...');


// Manual Connect Button (fallback)
ui.connectBtn.onclick = async () => {
  try {
    ui.connectBtn.disabled = true;
    ui.connectBtn.innerHTML = '<div class="loader"></div>';
    
    await connect(config, {
      connector: farcasterMiniApp(),
      chainId: monad.id
    });

    const account = getAccount(config);
    userAddress = account.address;

    if (userAddress) {
      const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      ui.userAddress.innerHTML = `<span class="address-display">${shortAddress}</span>`;
      ui.connectBtn.classList.add('hidden');
      showToast('Wallet Connected', '✅');
      await fetchFarcasterUser(userAddress);
      const balance = await checkNFTBalance(userAddress);
      updateState(balance);
    }
  } catch (error) {
    console.error(error);
    ui.connectBtn.disabled = false;
    ui.connectBtn.textContent = 'Connect Wallet';
    showToast('Connection Failed', '❌');
  }
};

// Mint Button
ui.mintBtn.onclick = async () => {
  try {
    ui.mintBtn.disabled = true;
    ui.mintBtn.innerHTML = '<div class="loader"></div> Minting...';
    
    const txHash = await writeContract(config, {
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'mint',
      value: parseEther(MINT_PRICE)
    });

    showToast('Transaction Sent', '⏳');
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    showToast('NFT Minted Successfully!', '🎉');
    
    const balance = await checkNFTBalance(userAddress);
    updateState(balance);
    
    ui.mintBtn.disabled = false;
    ui.mintBtn.innerHTML = '<span>Mint Whitelist Pass (13 MON)</span>';
  } catch (error) {
    console.error(error);
    showToast('Transaction Failed', '❌');
    ui.mintBtn.disabled = false;
    ui.mintBtn.innerHTML = '<span>Mint Whitelist Pass (13 MON)</span>';
  }
};

// Share Button
ui.shareBtn.onclick = async () => {
  try {
    await sdk.actions.composeCast({
      text: `🔮 Just secured my spot on the Monad Whitelist with an NFT pass! \n\nMint yours now and get guaranteed allocation 👇`,
      embeds: [GAME_URL]
    });
  } catch (error) {
    console.error('Share error:', error);
    showToast('Failed to share', '❌');
  }
};

// Details Button
ui.detailsBtn.onclick = () => {
  showToast('Opening contract details...', 'ℹ️');
  window.open(`https://monadvision.com/address/${NFT_CONTRACT}`, '_blank');
};