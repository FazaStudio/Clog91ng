const mysql = require('mysql');
const { ethers } = require('ethers');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'clogging'
});

const infuraUrl = 'https://ethereum-sepolia.core.chainstack.com/2e963bea1b390d48f5c4c75d9fb92d9c';
const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

const privateKey = '02a0a826d436c9f1f896eb00a2c5b2e6e4b50b14e22998ca353240b71873199a';

const ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "sellTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_pairAddress",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_tokenToSell",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_routerAddress",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdrawETH",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdrawToken",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	},
	{
		"inputs": [],
		"name": "DECIMALS",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PRECISION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "tokenToSell",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "uniswapPair",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "uniswapRouter",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

const contractAddress = '0xCE9006881719A2B69CD6AEa6a95011c5A8d632dd';
const contract = new ethers.Contract(contractAddress, ABI, provider);

async function sellTokens(amount) {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const signedContract = contract.connect(wallet);

        const tx = await signedContract.sellTokens(amount);
        console.log('Hash transaksi:', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaksi berhasil:', receipt);
    } catch (error) {
        console.error('Error penjualan token:', error);
        throw error;
    }
}

async function checkAndSellTokens() {
    try {
        const results = await new Promise((resolve, reject) => {
            connection.query('SELECT jumlahToken FROM batas WHERE id = ?', [1], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
            });
        });

        if (results.length === 0) {
            console.log('Tidak ada rekaman ditemukan untuk id 1.');
            return;
        }

        const jumlahTokenString = results[0].jumlahToken;
        const jumlahTokenInteger = ethers.utils.parseUnits(jumlahTokenString, 9);

        // Periksa jika saldo token adalah 30.000 atau lebih
        const thresholdAmount = ethers.utils.parseUnits('30000', 9); // 30.000 token
        if (jumlahTokenInteger.gte(thresholdAmount)) {
            // Hitung 50% dari 30.000 token untuk dijual
            const amountToSell = thresholdAmount.div(2);
            console.log(`Mencoba menjual ${amountToSell.toString()} token...`);
            await sellTokens(amountToSell);
        } else {
            console.log('Jumlah token belum mencapai batas yang ditentukan, tidak ada penjualan yang dilakukan.');
        }
    } catch (error) {
        console.error('Error dalam memeriksa dan menjual token:', error);
    }
}

// Interval polling (setiap 30 detik)
const pollingInterval = 30000;
setInterval(checkAndSellTokens, pollingInterval);

// Membangun koneksi MySQL dan memulai polling
connection.connect((err) => {
    if (err) {
        console.error('Error saat menghubungkan ke database:', err.stack);
        return;
    }
    console.log('Terhubung ke database MySQL.');

    // Mulai proses cek dan penjualan pertama kali
    checkAndSellTokens();
});
