const { ethers } = require('ethers');

// Ganti dengan alamat WebSocket (wss) yang sesuai
const infuraWsUrl = 'wss://eth-sepolia.g.alchemy.com/v2/-ZNPaLXHupPWA_-Dz5Y2E4BC6PRN3iQ9';

// Setup provider Ethereum menggunakan WebSocketProvider
const provider = new ethers.providers.WebSocketProvider(infuraWsUrl);

// Fungsi untuk mendapatkan block number
async function getBlockNumber() {
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log('Latest block number:', blockNumber);
    } catch (error) {
        console.error('Error fetching block number:', error);
    }
}

// Panggil fungsi getBlockNumber setiap 5 detik
setInterval(getBlockNumber, 5000);
