# Hacked Wallet Recovery 
## User friendly UI for building transaction bundles for Flashbots
Use the tool here: [HackedWalletRecovery.com](https://hackedwalletrecovery.com/)

Note: This can not be used to recover assets that are already sent to a hackers address, it can only help you send transactions from your hacked wallet on Mainnet.

Features:
- Displays a list of any assets sitting in the hacked wallet
- Provides ways to construct custom transactions using a contract ABI 
- You can paste in a raw transaction (super useful for airdrop claims!)
- Automatically handles gas estimations and the original funding transaction
- Attempts to automatically add the Flashbots RPC and guides the user through adding it manually if it fails

## How to use Hacked Wallet Recovery

### 1. Start by providing the hacked wallet address.

  Input the address of your hacked wallet and click "Discover". On the next screen you will see any ERC20, ERC721 and ERC1155 assets that are still in the wallet.

### 2. Select assets.

  If you don't see your asset or you need to do a specialized transaction click on "Add Manually". See [#manually-adding-assets] for detailed instructions. Once you have selected the assets(or the manually constructed transactions you just built) __in the order you want them to execute__ you can click "Continue".

  Note: If it fails to go to the next step it likely means there is a revert happening in your selected transactions. Make sure they are selected in the order you want them to execute and verify they are constructed properly.

### 3. Review the transactions

  Glance at the transactions on the list. Confirm they are in the order you anticipate and none are missing. Once you have confirmed click "Start Signing".

### 4. Connect safe wallet

  It will prompt you to connect a wallet that has funds to cover gas fees and for funding the hacked wallet so it can send transactions.

### 5. Switch to the Hacked Wallet Recovery RPC

  The app will prompt you to add a special RPC network that will allow you to prepare your transactions without sending them to the Mainnet mempool. This is a crucial step because if you continue without changing the RPC your funds will get swept by the hacker as soon as they are sent to your hacked wallet. Double check that you have switched to the new RPC and then continue.

### 6. Sign the funding transaction

  It will prompt you to sign a transaction that sends the necessary funds to the hacked wallet so the hacked wallet has enough funds to execute the transactions you selected earlier.

  Note: Even though you are signing transactions with your wallet in this step and the next these transactions are not actually executed on Mainnet until the final step where we submit the bundle. We are just creating the bundle right now.

### 7. Switch to your hacked wallet

  __This wallet must be connected to the same RPC we added earlier.__ Connect the wallet that was hacked in preparation for signing the transactions you selected earlier.

### 8. Sign the recovery transactions

  You will now be prompted to sign each transaction you selected earlier. Make sure you use the site suggested gas price and ignore any gas adjustment suggestions from your wallet provider as this may make the cost of the transactions greater than the funding transaction that you created at the beginning.

### 9. Wait for the transaction bundle to be included in a block

  The app will now try to submit your transactions as a bundle in every block until it gets accepted by a Flashbots relayer. Be patient as it may take a few minutes.

__YOU DID IT! RECOVERY COMPLETE!__

## Manually adding assets
You can manually add assets in four ways:
### 1. Add a ERC20, ERC721 or ERC1155 by it's details

  Select the "Basic" tab and click "Add" under the asset type you wish to add. Follow the prompts to add the contract address, token id(s) etc.

### 2. Create a custom transaction using the contract address and ABI for the method you are calling

  Click on "Custom". Enter the contract address you are going to call with your transaction. Now enter the function signature(e.g. `transfer(address,uint)` for a typical ERC20 send). It should show inputs for each parameter that your function requires. It can be helpful to play around with the contract on [Etherscan](https://etherscan.io/) in order to find the function signature if you aren't familiar with this process. Often times airdrop claims require you to provide a "proof" as one of the claim parameters. Sometimes they make this information easy for the public to find but often you have to [dig through the network requests](https://developer.chrome.com/docs/devtools/network) on the claim site to find this information. Read this note on [airdrop claims!](#airdrop-claims)

### 3. Paste in a raw transaction

  This may be the easiest for airdrop claims. Go to the claim site and go through the normal process for claiming. When the site sends the transaction to your wallet for signing - *don't sign* (you probably can't anyway for lack of funds). Instead of signing, copy the raw transaction and paste it in this box. Read this note on [airdrop claims!](#airdrop-claims)

### 4. ABI Ninja

  The [ABI Ninja](https://abi.ninja) method is great for helping you see what functions are available to call on the contract address you paste in. Paste in an address and then click "Load Contract". Next you should click the hamburger menu to see the read and write functions. Select the write function you want to use and then close the menu by either clicking outside of the sidebar or at very top of the menu there is an X icon. You should see the function with inputs for each parameter required. Once you have entered the parameters you can click "Send" and it should return you to the asset selection view in Hacked Wallet Recovery with your new transaction selected. If you encounter errors while in ABI Ninja it may be giving you helpful feedback on a mistake you made when adding a parameter.

  ABI Ninja has a limitation in that you cannot create a transaction that reverts. For instance, you can use it for creating a transaction to claim an airdrop but if you try to create a transaction for moving the airdropped tokens it will fail because your hacked account does not actually have the tokens yet, you have only created a transaction that *will* move the tokens when you execute all the transactions as a bundle. You can still use the other methods for creating a transaction to move the tokens.

### Airdrop claims
If you use option 2 or 3 for claiming an airdrop, make sure you also create a transaction that moves the token to a safe wallet. It would be sad to go through all this trouble just to watch your tokens get swept because you merely claimed them *to* your hacked wallet and forgot to move them out of your hacked wallet. You should be able to use the "Basic" tab (option 1) with the token contract address to move them out of your wallet. If that fails then you can use the "Custom" tab. *Just don't forget to do it!*

## Troubleshooting

You can join this [Telegram group](https://t.me/+1rbnZWGTpJExOGJh) for help when you encounter issues. Write in with all your details such as the hacked wallet and the asset(s) you are trying to recover and their value. No promises we will have the time to help your particular situation as we are just volunteers but we love ot help when we can.

## How to run the project locally

Make a copy of `packages/nextjs/.env.example` and name it `.env.local`
Adjust the following variables in that file:
For `NEXT_PUBLIC_ALCHEMY_API_KEY` enter an [Alchemy](https://www.alchemy.com/) API key.
For `NEXT_PUBLIC_NETWORK_KEY` leave it blank and it will default to Sepolia or you can enter 'mainnet' to use mainnet.
For `NEXT_PUBLIC_SHOW_DONATIONS` can be left blank unless you want to see the donations prompt at the end of the recovery process.

Then run the following commands:
`yarn install` and `yarn start`