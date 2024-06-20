const Web3 = require('web3');
const web3 = new Web3();

// Function to generate Ethereum accounts
function generateAccounts(numAccounts) {
    const accounts = [];
    for (let i = 0; i < numAccounts; i++) {
        const newAccount = web3.eth.accounts.create();
        accounts.push({
            address: newAccount.address,
            privateKey: newAccount.privateKey
        });
    }
    return accounts;
}

// Generate 5 Ethereum accounts
const numAccounts = 5;
const generatedAccounts = generateAccounts(numAccounts);

// Print generated accounts
generatedAccounts.forEach((account, index) => {
    console.log(`Account ${index + 1}:`);
    console.log(`Address: ${account.address}`);
    console.log(`Private Key: ${account.privateKey}`);
    console.log('-----------------------');
});
