var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
mnemonic="spirit supply whale amount human item harsh scare congress discover talent hamster"
//https://rinkeby.infura.io/v3/5e34747ee5624b1fa891fc5afbf5727c
module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      gas: 999999999
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/5e34747ee5624b1fa891fc5afbf5727c`),
        network_id: 4,       // rinkeby's id
        gas: 10000,        // rinkeby has a lower block limit than mainnet
        gasPrice: 10000000000
    },
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};