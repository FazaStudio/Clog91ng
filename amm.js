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
    // ABI lainnya
];

const contractAddress = '0xCE9006881719A2B69CD6AEa6a95011c5A8d632dd';
const contract = new ethers.Contract(contractAddress, ABI, provider);

const totalSupply = ethers.utils.parseUnits('1000000000', 9);

// Daftar threshold dan persentase untuk setiap transaksi
const transactions = [
    { threshold: ethers.utils.parseUnits('3000000', 9), percentage: 143 },
    { threshold: ethers.utils.parseUnits('2000000', 9), percentage: 150 },
    { threshold: ethers.utils.parseUnits('1000000', 9), percentage: 163 },
    { threshold: ethers.utils.parseUnits('2000000', 9), percentage: 170 },
    { threshold: ethers.utils.parseUnits('100000', 9), percentage: 183 },
    { threshold: ethers.utils.parseUnits('5000000', 9), percentage: 190 },
    // Tambahkan 43 transaksi lainnya di sini...
];

async function sellTokens(amount, transactionId, thresholdAmount, thresholdIndex) {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const signedContract = contract.connect(wallet);

        const tx = await signedContract.sellTokens(amount);
        console.log('Hash transaksi:', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaksi berhasil:', receipt);

        // Kurangi nilai di MySQL dengan nilai threshold setelah transaksi
        await new Promise((resolve, reject) => {
            connection.query('UPDATE batas SET jumlahToken = jumlahToken - ? WHERE id = ?', [ethers.utils.formatUnits(thresholdAmount, 9), transactionId], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
            });
        });
        console.log(`Data di MySQL telah dikurangi dengan nilai threshold untuk transaksi id ${transactionId}.`);

        // Tandai threshold telah diproses di MySQL
        await new Promise((resolve, reject) => {
            connection.query('UPDATE thresholds SET processed = 1 WHERE id = ?', [thresholdIndex], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
            });
        });
        console.log(`Threshold ${thresholdIndex} telah diproses dan ditandai di MySQL.`);
    } catch (error) {
        console.error('Error penjualan token:', error);
        throw error;
    }
}

async function checkAndSellTokens() {
    try {
        const results = await new Promise((resolve, reject) => {
            connection.query('SELECT id, jumlahToken FROM batas', (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
            });
        });

        if (results.length === 0) {
            console.log('Tidak ada rekaman ditemukan.');
            return;
        }

        for (const result of results) {
            const { id, jumlahToken } = result;
            const jumlahTokenInteger = ethers.utils.parseUnits(jumlahToken, 9);

            for (const [index, transaction] of transactions.entries()) {
                const { threshold, percentage } = transaction;
                const amountToSell = totalSupply.mul(percentage).div(10000);

                // Periksa apakah threshold sudah diproses
                const thresholdProcessed = await new Promise((resolve, reject) => {
                    connection.query('SELECT processed FROM thresholds WHERE id = ?', [index], (err, results) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(results.length > 0 && results[0].processed === 1);
                    });
                });

                if (thresholdProcessed) {
                    console.log(`Threshold ${index} sudah diproses, melanjutkan ke threshold berikutnya...`);
                    continue;
                }

                if (jumlahTokenInteger.gte(threshold)) {
                    console.log(`Mencoba menjual ${ethers.utils.formatUnits(amountToSell, 9)} token pada transaksi untuk id ${id}...`);
                    await sellTokens(amountToSell, id, threshold, index);
                    console.log(`Menunggu 60 detik sebelum memproses transaksi berikutnya...`);
                    await new Promise(resolve => setTimeout(resolve, 60000)); // Jeda 60 detik
                    break; // Pindah ke transaksi berikutnya setelah satu transaksi berhasil
                } else {
                    console.log(`Jumlah token belum mencapai batas threshold untuk transaksi id ${id}, tidak ada penjualan yang dilakukan.`);
                    break; // Keluar dari loop transaksi jika threshold tidak dipenuhi
                }
            }
        }
    } catch (error) {
        console.error('Error dalam memeriksa dan menjual token:', error);
    }
}

const pollingInterval = 30000;
setInterval(checkAndSellTokens, pollingInterval);

connection.connect((err) => {
    if (err) {
        console.error('Error saat menghubungkan ke database:', err.stack);
        return;
    }
    console.log('Terhubung ke database MySQL.');

    // Buat tabel thresholds jika belum ada
    connection.query('CREATE TABLE IF NOT EXISTS thresholds (id INT PRIMARY KEY, processed BOOLEAN DEFAULT 0)', (err, results) => {
        if (err) {
            console.error('Error membuat tabel thresholds:', err.stack);
            return;
        }
        // Masukkan data thresholds jika belum ada
        const thresholdInserts = transactions.map((_, index) => `(${index}, 0)`).join(', ');
        connection.query(`INSERT IGNORE INTO thresholds (id, processed) VALUES ${thresholdInserts}`, (err, results) => {
            if (err) {
                console.error('Error memasukkan data ke tabel thresholds:', err.stack);
                return;
            }
            console.log('Data thresholds berhasil dimasukkan ke database.');
            checkAndSellTokens();
        });
    });
});
