const mysql = require('mysql');
const { ethers } = require('ethers');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'clogging'
});

const infuraUrl = 'https://eth-sepolia.g.alchemy.com/v2/po3sfqjIZ_YnY0Xb19Hr_RgZAHVNvNfO';
const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

const privateKey = 'b40b3d05eec5ae1c4ecc9a139f9fdce3ce4b52c191b8e137ca42acb39d0d9b29';

const ABI = [
    {
        "inputs": [],
        "name": "manualSwap",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // ABI lainnya
];

const contractAddress = '0xE2126C33b1D0857019C8061740234Be9ea9Ab834';
const contract = new ethers.Contract(contractAddress, ABI, provider);

const totalSupply = ethers.utils.parseUnits('1000000000', 9); // Total supply dari token

// Buat array untuk melacak status eksekusi threshold
let thresholdExecuted = Array(20).fill(false);

// Fungsi asli manualSwap
async function manualSwap(transactionId, amountToSwap, percentage) {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const signedContract = contract.connect(wallet);

        const tx = await signedContract.manualSwap();
        console.log('Hash transaksi:', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaksi berhasil:', receipt);

        // Kurangi nilai di MySQL dengan persentase tertentu dari total supply
        const amountToReduce = ethers.utils.formatUnits(amountToSwap, 9);
        await new Promise((resolve, reject) => {
            connection.query('UPDATE batas SET jumlahToken = jumlahToken - ? WHERE id = ?', [amountToReduce, transactionId], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
            });
        });
        console.log(`Data di MySQL telah dikurangi sebesar ${percentage}% dari total supply untuk transaksi id ${transactionId}.`);
    } catch (error) {
        console.error('Error dalam melakukan swap manual:', error);
        throw error;
    }
}

// Fungsi alias untuk manualSwap
async function swapExactTokensForETH(transactionId, amountToSwap, percentage) {
    return manualSwap(transactionId, amountToSwap, percentage);
}

async function checkAndswapExactTokensForETH() {
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

            // Validasi jumlahToken
            if (!jumlahToken || jumlahToken.trim() === "") {
                console.log(`Nilai jumlahToken tidak valid untuk transaksi id ${id}, melewati transaksi ini.`);
                continue;
            }

            const jumlahTokenBigNumber = ethers.utils.parseUnits(jumlahToken, 9);

            // Definisikan threshold
            const thresholds = [
                { percentage: 1, amount: totalSupply.mul(1).div(100) },
                { percentage: 2, amount: totalSupply.mul(2).div(100) },
                { percentage: 3, amount: totalSupply.mul(3).div(100) },
                { percentage: 4, amount: totalSupply.mul(4).div(100) },
                { percentage: 5, amount: totalSupply.mul(5).div(100) },
                { percentage: 6, amount: totalSupply.mul(6).div(100) },
                { percentage: 7, amount: totalSupply.mul(7).div(100) },
                { percentage: 8, amount: totalSupply.mul(8).div(100) },
                { percentage: 9, amount: totalSupply.mul(9).div(100) },
                { percentage: 10, amount: totalSupply.mul(10).div(100) },
                { percentage: 11, amount: totalSupply.mul(11).div(100) },
                { percentage: 12, amount: totalSupply.mul(12).div(100) },
                { percentage: 13, amount: totalSupply.mul(13).div(100) },
                { percentage: 14, amount: totalSupply.mul(14).div(100) },
                { percentage: 15, amount: totalSupply.mul(15).div(100) },
                { percentage: 16, amount: totalSupply.mul(16).div(100) },
                { percentage: 17, amount: totalSupply.mul(17).div(100) },
                { percentage: 18, amount: totalSupply.mul(18).div(100) },
                { percentage: 19, amount: totalSupply.mul(19).div(100) },
                { percentage: 20, amount: totalSupply.mul(20).div(100) },
            ];

            for (let i = 0; i < thresholds.length; i++) {
                if (!thresholdExecuted[i] && jumlahTokenBigNumber.gte(thresholds[i].amount)) {
                    console.log(`Jumlah token mencapai ${thresholds[i].percentage}% dari total supply. Melakukan swap untuk transaksi id ${id}...`);
                    await swapExactTokensForETH(id, thresholds[i].amount, thresholds[i].percentage); // Menggunakan alias swapExactTokensForETH
                    thresholdExecuted[i] = true; // Tandai threshold ini sebagai sudah dieksekusi
                    console.log(`Menunggu 60 detik sebelum memproses transaksi berikutnya...`);
                    await new Promise(resolve => setTimeout(resolve, 60000)); // Jeda 60 detik
                    break; // Keluar dari loop setelah melakukan swap
                }
            }

            console.log(`Jumlah token belum mencapai threshold untuk transaksi id ${id}, tidak ada swap yang dilakukan.`);
        }
    } catch (error) {
        console.error('Error dalam memeriksa dan melakukan manual swap:', error);
    }
}

const pollingInterval = 60000;
setInterval(checkAndswapExactTokensForETH, pollingInterval);

connection.connect((err) => {
    if (err) {
        console.error('Error saat menghubungkan ke database:', err.stack);
        return;
    }
    console.log('Terhubung ke database MySQL.');

    // Buat tabel batas jika belum ada
    connection.query('CREATE TABLE IF NOT EXISTS batas (id INT PRIMARY KEY, jumlahToken VARCHAR(255))', (err, results) => {
        if (err) {
            console.error('Error membuat tabel batas:', err.stack);
            return;
        }

        console.log('Tabel batas berhasil dibuat atau sudah ada.');
        checkAndswapExactTokensForETH();
    });
});
