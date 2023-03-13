import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  Circuit,
  Reducer,
} from 'snarkyjs';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Auction contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Auction contract Auctions Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */
export class Auction extends SmartContract {
  @state(Field) num = State<Field>();
  reducer = Reducer({ actionType: Field });

  init() {
    super.init();
    this.num.set(Field(1));
  }

  @method sendAction() {
    this.reducer.dispatch(Field(1));
    // this.reducer.getActions();
    const timestamp = this.network.timestamp.get();
    this.network.timestamp.assertEquals(timestamp);
  }

  @method subtract(subtractContractAuctionress: PublicKey) {
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const subtractContract = new Subtract(subtractContractAuctionress);
    const newState = subtractContract.subtract(currentState);
    Circuit.log(newState);
    this.num.set(newState);
  }

  @method update() {
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const newState = currentState.add(2);
    this.num.set(newState);
  }
}

export class Subtract extends SmartContract {
  @state(Field) num = State<Field>();

  init() {
    super.init();
    this.num.set(Field(1));
  }

  @method subtract(source: Field): Field {
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const newState = source.sub(currentState);
    this.num.set(newState);

    return newState;
  }
}

// An example class for demonstrating Actions and Reducers in SnarkyjS
export class ActionDispatcher extends SmartContract {
  reducer = Reducer({ actionType: Field });

  @method sendAction() {
    this.reducer.dispatch(Field(1));
  }
}
