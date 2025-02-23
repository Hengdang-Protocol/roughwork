#!/usr/bin/env node

import { KeyGenerator } from '../utils/keys';

async function main() {
  if (!process.argv[2]) {
    console.error('Please provide the mnemonic phrase to restore');
    console.log('\nUsage: npm run key:restore "your mnemonic phrase here"');
    process.exit(1);
  }

  try {
    const mnemonic = process.argv[2];
    const keyPair = await KeyGenerator.generateKeyPair(mnemonic);
    
    console.log('\n🔄 Restored Keys:\n');
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
