const { Signer, Provider, Contract } = require('koilib');
const path = require('path');
const fs = require('fs');
const abi = require('./../abi/token-abi.json')
require('dotenv').config();

const { PRIVATE_KEY, RPC_URL } = process.env;

abi.koilib_types = abi.types;

async function main() {
  // deploy bridge contract
  const provider = new Provider(RPC_URL);
  const signer = Signer.fromWif(PRIVATE_KEY);
  signer.provider = provider;

  const bytecode = fs.readFileSync(path.resolve(__dirname, '../build/release/contract.wasm'));
  const bridgeContract = new Contract({
    id: signer.address,
    abi,
    provider,
    signer,
    bytecode
  });

  const { operation, transaction, receipt } = await bridgeContract.deploy({
    abi: fs.readFileSync(path.resolve(__dirname, '../abi/token.abi')).toString()
  });
  console.log(transaction)
  console.log(receipt)
}

main()
  .catch(error => console.error(error));