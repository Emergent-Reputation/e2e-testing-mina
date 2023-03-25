import { Auction, Subtract } from './Auction';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Reducer,
  Circuit,
} from 'snarkyjs';

/*
 * This file specifies how to test the `Auction` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Auction', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAuctionress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkAppAuctionress2: PublicKey,
    zkAppPrivateKey2: PrivateKey,
    zkApp: Auction,
    zkApp2: Subtract;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) Auction.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey2 = PrivateKey.random();
    zkAppAuctionress2 = zkAppPrivateKey2.toPublicKey();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAuctionress = zkAppPrivateKey.toPublicKey();
    zkApp = new Auction(zkAppAuctionress);
    zkApp2 = new Subtract(zkAppAuctionress2);
  });

  afterAll(() => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
      zkApp.actionsHash.set(Reducer.initialActionsHash);
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` Auctions an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();

    const txn2 = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp2.deploy();
    });
    await txn2.prove();
    // this tx needs .sign(), because `deploy()` Auctions an account update that requires signature authorization
    await txn2.sign([deployerKey, zkAppPrivateKey2]).send();
  }

  it.only('experiments with actions', async () => {
    await localDeploy();
    let txn = await Mina.transaction(deployerAccount, () => {
      zkApp.submitOffer(Field(2000000), Field(1));
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
    // // Sleep for 1 second to allow the transaction to be processed
    // // await new Promise((resolve) => setTimeout(resolve, 100));
    let txn2 = await Mina.transaction(deployerAccount, () => {
      zkApp.getActions();
    });
    await txn2.prove();
    await txn2.sign([deployerKey]).send();
  });

  it('generates and deploys the `Auction` and `Subtract` smart contract', async () => {
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(1));
    const num2 = zkApp2.num.get();
    expect(num2).toEqual(Field(1));
  });

  it('correctly updates the num state on the `Auction` smart contract', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.update();
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(3));
  });

  it('Auction correctly uses Call stack composability to subtract a value using Subtract update method', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.subtract(zkAppAuctionress2);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(0));
  });
});
