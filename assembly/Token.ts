import {
  Arrays,
  System,
  Storage,
  Protobuf,
  value,
  Crypto,
  SafeMath,
} from "@koinos/sdk-as";
import { token } from "./proto/token";
import { Spaces } from "./Spaces";
import { Constants } from "./Constants";

/**
 * Represents a Koinos example token contract.
 */
export class Token {
  contractId: Uint8Array;
  supply: Storage.Obj<token.uint64>;
  balances: Storage.Map<Uint8Array, token.uint64>;
  allowances: Storage.Map<Uint8Array, token.uint64>;

  /**
   * Initializes a new instance of the Token class.
   */
  constructor() {
    this.contractId = System.getContractId();
    this.supply = new Storage.Obj(
      this.contractId,
      Spaces.SUPPLY_SPACE_ID,
      token.uint64.decode,
      token.uint64.encode,
      () => new token.uint64(0)
    );
    this.balances = new Storage.Map(
      this.contractId,
      Spaces.BALANCES_SPACE_ID,
      token.uint64.decode,
      token.uint64.encode,
      () => new token.uint64(0)
    );
    this.allowances = new Storage.Map(
      this.contractId,
      Spaces.ALLOWANCES_SPACE_ID,
      token.uint64.decode,
      token.uint64.encode,
      null
    );
  }

  /**
   * Retrieves the name of the token.
   * @param {token.name_arguments} args - The arguments for retrieving the token name.
   * @returns {token.str} The name of the token.
   */
  name(args: token.name_arguments): token.str {
    return new token.str(Constants.name);
  }

  /**
   * Retrieves the symbol of the token.
   * @param {token.symbol_arguments} args - The arguments for retrieving the token symbol.
   * @returns {token.str} The symbol of the token.
   */
  symbol(args: token.symbol_arguments): token.str {
    return new token.str(Constants.symbol);
  }

  /**
   * Retrieves the number of decimal places used by the token.
   * @param {token.decimals_arguments} args - The arguments for retrieving the token decimals.
   * @returns {token.uint32} The number of decimal places used by the token.
   */
  decimals(args: token.decimals_arguments): token.uint32 {
    return new token.uint32(Constants.decimals);
  }

  /**
   * Retrieves detailed information about the token, including name, symbol, and decimals.
   * @param {token.get_info_arguments} args - The arguments for retrieving token information.
   * @returns {token.info} Detailed information about the token.
   */
  get_info(args: token.get_info_arguments): token.info {
    return new token.info(Constants.name, Constants.symbol, Constants.decimals);
  }

  /**
   * Retrieves the total supply of the token.
   * @param {token.total_supply_arguments} args - The arguments for retrieving the token total supply.
   * @returns {token.uint64} The total supply of the token.
   */
  total_supply(args: token.total_supply_arguments): token.uint64 {
    return this.supply.get()!;
  }

  /**
   * Retrieves the balance of a specific account.
   * @param {token.balance_of_arguments} args - The arguments for retrieving the account balance.
   * @returns {token.uint64} The balance of the specified account.
   */
  balance_of(args: token.balance_of_arguments): token.uint64 {
    return this.balances.get(args.owner)!;
  }

  /**
   * Retrieves the allowance granted by an owner to a spender.
   * @param {token.allowance_arguments} args - The arguments for retrieving the allowance.
   * @returns {token.uint64} The allowance granted by the owner to the spender.
   */
  allowance(args: token.allowance_arguments): token.uint64 {
    const key = new Uint8Array(50);
    key.set(args.owner, 0);
    key.set(args.spender, 25);
    const allowance = this.allowances.get(key);
    if (!allowance) return new token.uint64(0);
    return allowance;
  }

  /**
   * Retrieves the signers associated with the current transaction.
   * @returns {Array<Uint8Array>} An array of signer addresses.
   */
  getSigners(): Array<Uint8Array> {
    const sigBytes =
      System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(
      sigBytes,
      value.list_type.decode
    );
    const txId = System.getTransactionField("id")!.bytes_value;
    const signers: Array<Uint8Array> = [];
    for (let i = 0; i < signatures.values.length; i++) {
      const publicKey = System.recoverPublicKey(
        signatures.values[i].bytes_value,
        txId
      );
      const address = Crypto.addressFromPublicKey(publicKey!);
      signers.push(address);
    }
    return signers;
  }

  /**
   * Checks the authority for a specific account based on the provided parameters.
   * @param {Uint8Array} account - The account to check authority for.
   * @param {boolean} acceptAllowances - Indicates whether to consider allowances in the authority check.
   * @param {u64} amount - The amount involved in the authority check.
   * @returns {boolean} Returns true if the account has authority; otherwise, returns false.
   */
  private check_authority(
    account: Uint8Array,
    acceptAllowances: boolean,
    amount: u64
  ): bool {
    const caller = System.getCaller();

    const key = new Uint8Array(50);
    if (acceptAllowances) {
      key.set(account, 0);
    }

    // check if there is a caller (smart contract in the middle)
    if (caller.caller && caller.caller.length > 0) {
      if (acceptAllowances) {
        // check if the caller is approved for all tokens
        key.set(caller.caller, 25);
        const allowance = this.allowances.get(key);
        if (allowance && allowance.value >= amount) {
          // spend allowance
          allowance.value -= amount;
          this.allowances.put(key, allowance);
          return true;
        }
      }

      // check if the account is the caller
      if (Arrays.equal(account, caller.caller)) return true;

      // the transaction has a caller but none of the different
      // options authorized the operation, then it is rejected.
      return false;
    }

    // // check the signatures related to allowances
    const signers = this.getSigners();

    // there is no caller, no approval from allowances, and the account
    // doesn't have a contract then check if the account signed the transaction
    for (let i = 0; i < signers.length; i += 1) {
      if (Arrays.equal(account, signers[i])) return true;
    }

    // none of the different options authorized the operation,
    // then it is rejected.
    return false;
  }

  /**
   * Approves the spender to transfer a specific amount of tokens on behalf of the owner.
   * @param {token.approve_arguments} args - The arguments for the approval operation.
   * @returns {void}
   */
  _approve(args: token.approve_arguments): void {
    const key = new Uint8Array(50);
    key.set(args.owner, 0);
    key.set(args.spender, 25);
    this.allowances.put(key, new token.uint64(args.value));

    const impacted = [args.spender, args.owner];
    const approveEvent = new token.approve_event(
      args.owner,
      args.spender,
      args.value
    );
    System.event(
      "token.approve",
      Protobuf.encode<token.approve_event>(
        approveEvent,
        token.approve_event.encode
      ),
      impacted
    );
  }

  /**
   * Transfers tokens from one account to another.
   * @param {token.transfer_arguments} args - The arguments for the transfer operation.
   * @returns {token.empty_object}
   */
  _transfer(args: token.transfer_arguments): void {
    let fromBalance = this.balances.get(args.from)!;
    System.require(
      fromBalance.value >= args.value,
      "account 'from' has insufficient balance"
    );
    fromBalance.value -= args.value;
    this.balances.put(args.from, fromBalance);

    let toBalance = this.balances.get(args.to)!;
    toBalance.value += args.value;
    this.balances.put(args.to, toBalance);

    const impacted = [args.to, args.from];
    const transferEvent = new token.transfer_event(
      args.from,
      args.to,
      args.value
    );
    System.event(
      "token.transfer",
      Protobuf.encode<token.transfer_event>(
        transferEvent,
        token.transfer_event.encode
      ),
      impacted
    );
  }

  /**
   * Mints new tokens and adds them to the specified account.
   * @param {token.mint_arguments} args - The arguments for the mint operation.
   * @returns {token.empty_object}
   */
  _mint(args: token.mint_arguments): void {
    const supply = this.supply.get()!;
    System.require(
      supply.value <=
        SafeMath.sub(
          Constants.max_supply,
          args.value,
          "mint would overflow supply"
        ),
      "mint would overflow supply"
    );

    let toBalance = this.balances.get(args.to)!;
    toBalance.value += args.value;
    this.balances.put(args.to, toBalance);
    supply.value += args.value;
    this.supply.put(supply);

    const impacted = [args.to];
    const mintEvent = new token.mint_event(args.to, args.value);
    System.event(
      "token.mint",
      Protobuf.encode<token.mint_event>(mintEvent, token.mint_event.encode),
      impacted
    );
  }

  /**
   * Burns tokens by deducting them from the specified account and reducing the total supply.
   * @param {token.burn_arguments} args - The arguments for the burn operation.
   * @returns {token.empty_object}
   */
  _burn(args: token.burn_arguments): void {
    let fromBalance = this.balances.get(args.from)!;
    System.require(
      fromBalance.value >= args.value,
      "account 'from' has insufficient balance"
    );

    const supply = this.supply.get()!;
    fromBalance.value -= args.value;
    this.balances.put(args.from, fromBalance);
    supply.value -= args.value;
    this.supply.put(supply);

    const impacted = [args.from!];
    const burnEvent = new token.burn_event(args.from, args.value);
    System.event(
      "token.burn",
      Protobuf.encode<token.burn_event>(burnEvent, token.burn_event.encode),
      impacted
    );
  }

  /**
   * Approves the spender to transfer a specific amount of tokens on behalf of the owner.
   * @param {token.approve_arguments} args - The arguments for the approval operation.
   * @returns {token.empty_object}
   */
  approve(args: token.approve_arguments): token.empty_object {
    const isAuthorized = this.check_authority(args.owner, false, 0);
    System.require(isAuthorized, "approve operation not authorized");
    this._approve(args);
    return new token.empty_object();
  }

  /**
   * Transfers tokens from one account to another.
   * @param {token.transfer_arguments} args - The arguments for the transfer operation.
   * @returns {token.empty_object}
   */
  transfer(args: token.transfer_arguments): token.empty_object {
    const isAuthorized = this.check_authority(args.from, true, args.value);
    System.require(isAuthorized, "from has not authorized transfer");
    this._transfer(args);
    return new token.empty_object();
  }

  /**
   * Mints new tokens and adds them to the specified account.
   * @param {token.mint_arguments} args - The arguments for the mint operation.
   * @returns {token.empty_object}
   */
  mint(args: token.mint_arguments): token.empty_object {
    const isAuthorized = this.check_authority(this.contractId, false, 0);
    System.require(isAuthorized, "owner has not authorized mint");
    this._mint(args);
    return new token.empty_object();
  }

  /**
   * Burns tokens by deducting them from the specified account and reducing the total supply.
   * This token contract does not have a burn method.
   * @param {token.burn_arguments} args - The arguments for the burn operation.
   * @returns {token.empty_object}
   */
  burn(args: token.burn_arguments): token.empty_object {
    // this token contract does not have burn method
    // const isAuthorized = this.check_authority(this.contractId, false, 0);
    // System.require(isAuthorized, "owner has not authorized mint");
    // this._burn(args);
    return new token.empty_object();
  }
}
