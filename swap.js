const connection = require('./db'); // Import module koneksi database
const { ethers } = require('ethers');
const { ChainId, Token, TokenAmount, TradeType, Fetcher, Route, Trade, Percent } = require('@uniswap/sdk');

// Fungsi untuk mengambil jumlah token dari MySQL
function getTokenAmountFromMySQL(callback) {
    connection.query('SELECT jumlahToken FROM batas WHERE id = 1', (error, results) => {
        if (error) {
            throw error;
        }
        // Ensure the fetched value is properly handled
        const tokenAmountFromMySQL = results[0].jumlahToken;
        
        // Check if tokenAmountFromMySQL is a number (assuming it's a number from MySQL)
        if (typeof tokenAmountFromMySQL !== 'number') {
            throw new Error('Expected token amount to be a number');
        }

        callback(tokenAmountFromMySQL); // Mengembalikan jumlah token dari hasil query
    });
}

// Fungsi untuk memperbarui jumlah token di MySQL setelah swap berhasil
function updateTokenAmountInMySQL(newTokenAmount) {
    connection.query('UPDATE batas SET jumlahToken = ? WHERE id = 1', [newTokenAmount], (error, results) => {
        if (error) {
            throw error;
        }
        console.log('Jumlah token di MySQL telah diperbarui.');
    });
}

async function performSwapIfPossible() {
    try {
        // Inisialisasi provider Ethereum (misalnya menggunakan Infura)
        const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia.core.chainstack.com/2e963bea1b390d48f5c4c75d9fb92d9c');

        // Token yang akan ditukar (misalnya, DAI)
        const DAI = new Token(ChainId.SEPOLIA, '0x02e785da1725BF1dF7224cd0C5bE5DEc89E30fbf', 18);

        // Fetch WETH token (Wrapped Ether) dari blockchain
        const WETH = await Fetcher.fetchTokenData(ChainId.SEPOLIA, '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', provider);

        // Mengambil jumlah token dari MySQL
        getTokenAmountFromMySQL(async (tokenAmountFromMySQL) => {
            // Pastikan tokenAmountFromMySQL adalah string
            const tokenAmountString = tokenAmountFromMySQL.toString(); // Konversi ke string jika perlu

            // Menghilangkan pemisah ribuan (jika ada) dan mengonversi ke Number
            const tokenAmount = parseFloat(tokenAmountString.replace(/\./g, ''));

            if (tokenAmount >= 1000000) {
                // Jika jumlah token lebih dari atau sama dengan 1 juta, lakukan swap
                const amountToSell = tokenAmount / 2; // Jual 50% dari jumlah token
                console.log('Jumlah token yang akan dijual:', amountToSell);

                // Fetch pair data antara DAI dan WETH dari blockchain
                const pair = await Fetcher.fetchPairData(DAI, WETH, provider);

                // Membuat route untuk token yang ditukar (DAI ke WETH)
                const route = new Route([pair], DAI);

                // Membuat trade dengan tipe exact input (tukar DAI ke WETH)
                const trade = new Trade(route, new TokenAmount(DAI, amountToSell.toString()), TradeType.EXACT_INPUT);

                // Konfigurasi slippage tolerance (opsional)
                const slippageTolerance = new Percent('50', '10000'); // 0.5% slippage tolerance

                // Menghitung trade terbaik yang memenuhi kondisi exact input
                const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // Jumlah minimum ETH yang diterima

                // Inisialisasi wallet Ethereum dengan private key
                const privateKey = '02a0a826d436c9f1f896eb00a2c5b2e6e4b50b14e22998ca353240b71873199a'; // Ganti dengan private key Anda
                const wallet = new ethers.Wallet(privateKey, provider);

                // Inisialisasi contract Uniswap Router
                const routerAddress = '0x86dcd3293C53Cf8EFd7303B57beb2a3F671dDE98'; // Alamat Uniswap V2 Router di Mainnet
                const uniswapRouter = new ethers.Contract(routerAddress, [
                    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
                ], wallet);

                // Menentukan deadline (waktu maksimum untuk eksekusi swap)
                const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 menit dari sekarang

                // Eksekusi swapExactTokensForETH
                const tx = await uniswapRouter.swapExactTokensForETH(
                    ethers.utils.parseUnits(amountToSell.toString(), 18), // Jumlah token input yang akan dijual
                    amountOutMin, // Jumlah minimum ETH yang diterima
                    [DAI.address, WETH.address], // Path token (dari DAI ke WETH)
                    wallet.address, // Alamat penerima ETH
                    deadline // Deadline eksekusi swap
                );

                console.log('Swap berhasil! Hash transaksi:', tx.hash);

                // Mengurangi jumlah token di MySQL setelah swap berhasil
                const newTokenAmount = tokenAmount - 1000000; // Mengurangi 1 juta token dari jumlah total
                updateTokenAmountInMySQL(newTokenAmount.toString());
            } else {
                console.log('Jumlah token tidak mencapai atau melebihi 1 juta. Tidak melakukan swap.');
            }
        });
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
    }
}

performSwapIfPossible();
