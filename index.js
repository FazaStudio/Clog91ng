const connection = require('./db'); // Menggunakan file konfigurasi MySQL

const { ethers } = require('ethers');
const usdtABI = require('./usdt.json');

// Setup Ethereum provider (contoh menggunakan Infura)

async function main(){
    
    const UsdtAddress = '0x38A5e1e4C2e5CD4c91279b097e888737488a5EBc'; //pairaddress
    
    const provider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/ob1DzIlPhoWA8CHH9_MIwiPJAx1usvsC');

    const contract  = new ethers.Contract(UsdtAddress,usdtABI , provider);
    contract.on('Swap', (from, to, address, value, event) => {
        let tokenContractAddress = '0x38A5e1e4C2e5CD4c91279b097e888737488a5EBc'; // Ganti dengan alamat kontrak token yang sesuai
        
        if (from !== tokenContractAddress) {
            let formattedValue = ethers.utils.formatUnits(value, 9);
            let idToUpdate = 1;
            let query = 'UPDATE batas SET jumlahToken = jumlahToken + ? WHERE id = ?';
             let jumlahToken = [formattedValue, idToUpdate];
             connection.query(query, jumlahToken, (err, result) => {
                if (err) {
                    console.error('Error saving value to MySQL: ' + err.stack);
                    return;
                }
                console.log('Value saved to MySQL:', formattedValue);
            });


            let info = {
                from: from,
                to: to,
                address: address,
                value: formattedValue,
                event: event,
            };
            console.log(JSON.stringify(info, null, 4));
        }
    });
    

}
main();