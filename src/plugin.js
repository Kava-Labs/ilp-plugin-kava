const debug = require('debug')('ilp-plugin-kava')
const request = require('request-promise-native')
const BigNumber = require('bignumber.js')
const PluginPayment = require('ilp-plugin-payment')
const { RpcClient } = require('tendermint')

const utils = require('./utils.js')


class KavaPlugin extends PluginPayment {
  constructor (opts) {
    // Available Options:
    
    // kavaNodeURI: 'ws://domain:port' web socket url for rpc server
    // kavaClientURI: http url for light client rest server
    // kavaAddress: on chain address of kava account
    // kavaAccountName: light client name associated with kavaAddress
    // kavaAccountPassword: light client password associated with kavaAddress
    
    // role: 'client' or 'server'
    
    // if role == 'client'
    // server: url for server plugin
    // reconnectInterval: optional - the interval on which the plugin tries to reconnect
    
    //if role == 'server'
    // settleTo: string of a number, default '0', what to settle client balances to
    // settleThreshold: string of a number, when to settle, balance is how much this plugin is owed.
    // port: optional, defaults to 3000, port this plugin listens on
    // wsOpts: optional, defaults to {port: opt.port}, overides port option, passed to WebSocket.Server()
    // _store: an ilp-store to persist client details
    // currencyScale: not currently used
    // allowedOrigins - optional
    // _log - optional
    // debugHostIldcpInfo - for debugging
    
    //TODO move this check to ilp-plugin-payment
    if (opts.settleThreshold) {
      if (parseInt(opts.settleThreshold) > 0) {
        throw new Error('settleThreshold must be less than or equal to 0')
      }
    }
    // Verifying presence of kavaAddress, otherwise plugin.sendMoney errors obscurely.
    //TODO make plugin.sendMoney not error obscurely
    if (!opts.kavaAddress) {
      throw new Error('kavaAddress must be specified')
    }
    
    super(opts)
    this.kavaNodeURI = opts.kavaNodeURI
    this.kavaClientURI = opts.kavaClientURI
    this.kavaAddress = opts.kavaAddress
    this.kavaAccountName = opts.kavaAccountName
    this.kavaAccountPassword = opts.kavaAccountPassword
    
  }

  async connectPayment () {
    //TODO setup account through LCD if not there already
    this.kavaNode = RpcClient(this.kavaNodeURI)
    await this.kavaNode.subscribe({query: "tm.event='Tx'"}, this.txEventHandler.bind(this))
    debug('Succesfully subscribed to Kava node.')
  }

  async sendPayment (details, amount) {
    debug('sending payment')

    // Get sequence and account number for sending account.
    let response = await request.get({
        uri: this.kavaClientURI+`/accounts/${this.kavaAddress}`,
        json: true // Automatically stringifies the body to JSON
    })
    let sequenceNumber = parseInt(response.value.sequence)
    let accountNumber = parseInt(response.value.account_number)
    

    // Send payment.
    let paymentPostData = {
        uri: this.kavaClientURI+`/accounts/${details.kavaAddress}/send`,
        body: {
          amount: [
            {denom: "KVA", amount: parseInt(amount)}
          ],
          name: this.kavaAccountName,
          password: this.kavaAccountPassword,
          chain_id: 'test-kava',
          sequence: sequenceNumber,
          account_number: accountNumber,
          gas: 10**6 // Set available gas high so it doesn't run out. TODO add fees
        },
        json: true
    };

    return await request.post(paymentPostData)
  }

  async getPaymentDetails (userId) {
    debug('sending back details')
    return {
      kavaAddress: this.kavaAddress
    }
  }
  
  async txEventHandler (response) {
    debug("received transaction")
    let tx = await this.decodeTx(response.TxResult.tx)
    let inputs = tx.value.msg.value.inputs
    let outputs = tx.value.msg.value.outputs

    // Constrain the transaction types to those with only one input and one output.
    // Then the coins on the input must be the same as the coins on the output.
    // TODO refactor tx into class.
    // TODO add warning when tx recieved but blocked by filters

    // allow only txs with one sender and reciever
    if (inputs.length == 1 && outputs.length == 1) {
      // check this plugin's account is the destination
      if (utils.convertHexToBech32(outputs[0].address, "cosmosaccaddr") == this.kavaAddress) {
        // check amount is KVA
        if (outputs[0].coins.map((c) => c.denom).includes("KVA")) {
          // TODO Check it came from existing user. Otherwise this will fire for any transfer to this plugin's account
          if (true) {
            //TODO use currencyScale
            debug("emitting 'money' event")
            let totalKVA = outputs[0].coins.map((c) => parseInt(c.amount)).reduce((a, b) => a + b, 0)
            this.emit('money', inputs[0].address, new BigNumber(totalKVA).toString())
          }
        }
      }
    }
  }

  async decodeTx(txbase64) {
    // Decode tx using client api as amino encoding only exists in go right now.
    let postData = {
        uri: this.kavaClientURI+"/decode_tx",
        body: {
          txbase64: txbase64
        },
        json: true
    };
    return await request.post(postData)
  }
}

module.exports = KavaPlugin
