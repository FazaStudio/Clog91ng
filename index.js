const connection = require('./db'); // Menggunakan file konfigurasi MySQL
require('dotenv').config();
const { ethers } = require('ethers');
const usdtABI = require('./usdt.json');

// Setup Ethereum provider (contoh menggunakan Infura)

async function main(){
    const UsdtAddress = process.env.pairAddress; //pairaddress
    const provider = new ethers.providers.WebSocketProvider(process.env.WEB_SOCKET);
    const contract = new ethers.Contract(UsdtAddress, usdtABI, provider);

    contract.on('Swap', (from, to, address, value, event) => {
        let tokenContractAddress = process.env.contractAddress; // Ganti dengan alamat kontrak token yang sesuai
        
        if (from !== tokenContractAddress) {
            let formattedValue = ethers.utils.formatUnits(value, 9);
            let integerValue = Math.floor(Number(formattedValue)); // Mengubah nilai menjadi integer
            let idToUpdate = 1;
            let query = process.env.query;
            let jumlahToken = [integerValue, idToUpdate];
            
            connection.query(query, jumlahToken, (err, result) => {
                if (err) {
                    console.error('Error saving value to MySQL: ' + err.stack);
                    return;
                }
                console.log('Value saved to MySQL:', integerValue);
            });

            let info = {
                from: from,
                to: to,
                address: address,
                value: integerValue,
                event: event,
            };
            console.log(JSON.stringify(info, null, 4));
        }
    });
}

main();
