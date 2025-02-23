#!/usr/bin/env node

import { KeyGenerator } from '../utils/keys';

async function main() {
  try {
    const mnemonic = KeyGenerator.generateMnemonic();
    console.log('\n🌱 Generated Mnemonic (keep this safe!):\n');
    console.log(mnemonic);
    
    const keyPair = await KeyGenerator.generateKeyPair(mnemonic);
    
    console.log('\n🔑 Generated Keys:\n');
    console.log('Private Key:', keyPair.privateKey);
    console.log('Public Key:', keyPair.publicKey);
    console.log('HPUB:', keyPair.hpub);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

main();
