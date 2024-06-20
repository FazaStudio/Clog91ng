const Web3 = require('web3');

// Ganti dengan URL node Ethereum Anda
const providerUrl = 'https://mainnet.infura.io/v3/your_infura_project_id';
const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));

// Daftar wallet dan kunci pribadi
const wallets = [
    {
        address: '0xWalletAddress1',
        privateKey: Buffer.from('private_key_hex1', 'hex')
    },
    {
        address: '0xWalletAddress2',
        privateKey: Buffer.from('private_key_hex2', 'hex')
    },
    {
        address: '0xWalletAddress3',
        privateKey: Buffer.from('private_key_hex3', 'hex')
    },
    // Tambahkan wallet lainnya di sini
];

// Contoh fungsi untuk membeli MEV pada blok pertama
async function buyOnFirstBlock(wallet) {
    // Mendapatkan nomor blok saat ini
    const currentBlockNumber = await web3.eth.getBlockNumber();

    // Menunggu blok pertama
    if (currentBlockNumber === 0) {
        console.log(`Purchasing on first block from ${wallet.address}...`);

        const transactionObject = {
            from: wallet.address,
            to: 'contract_address_of_MEV_seller',
            gasPrice: '6000000000', // Gas price in wei (6 gwei in this example)
            gas: 21000, // Gas limit for a simple transaction
            value: web3.utils.toWei('0.1', 'ether') // 0.1 ETH example value
        };

        try {
            const signedTransaction = await web3.eth.accounts.signTransaction(transactionObject, wallet.privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
            console.log(`Transaction receipt for ${wallet.address}:`, receipt);
        } catch (error) {
            console.error(`Error sending transaction from ${wallet.address}:`, error);
        }
    } else {
        console.log(`Waiting for first block for ${wallet.address}...`);
    }
}

// Fungsi untuk menjalankan transaksi untuk setiap wallet
async function executeTransactions() {
    for (let i = 0; i < wallets.length; i++) {
        await buyOnFirstBlock(wallets[i]);
    }
}

// Panggil fungsi untuk memulai proses pembelian pada blok pertama
executeTransactions();
