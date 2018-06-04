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
    // address: on chain address of kava account
    // kavaAccountName: light client name associated with address
    // kavaAccountPassword: light client password associated with address
    
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
    super(opts)
    this.kavaNodeURI = opts.kavaNodeURI
    this.kavaClientURI = opts.kavaClientURI
    //TODO change "address" to something less ambiguous
    this.address = opts.address //TODO verify presence, otherwise plugin.sendMoney errors obscurely
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

    // Get sequence number for sending account.
    let response = await request.get({
        uri: this.kavaClientURI+`/accounts/${this.address}`,
        json: true // Automatically stringifies the body to JSON
    })
    let sequenceNumber = parseInt(response.value.sequence)
    

    // Send payment.
    let paymentPostData = {
        uri: this.kavaClientURI+`/accounts/${details.address}/send`,
        body: {
          amount: [
            {denom: "kavaToken", "amount": parseInt(amount)}
          ],
          name: this.kavaAccountName,
          password: this.kavaAccountPassword,
          chain_id: 'kava',
          sequence: sequenceNumber,
        },
        json: true
    };

    return await request.post(paymentPostData)
  }

  async getPaymentDetails (userId) {
    debug('sending back details')
    return {
      address: this.address
    }
  }
  
  async txEventHandler (response) {
    let tags = utils.extractTxTags(response)
    
    let senders = tags.filter((tag) => tag.key == "sender").map((tag) => tag.value)
    let recipients = tags.filter((tag) => tag.key == "recipient").map((tag) => tag.value)
    let coins = tags.filter((tag) => tag.key == "amount").map((tag) => tag.value)
    
    // allow only txs with one sender and reciever
    if (senders.length == 1 && recipients.length == 1) {
      // check this plugin's account is the destination
      if (recipients.includes(this.address.toUpperCase())) {
        // check amount is kavaToken
        if (coins.length > 0 && coins[0].kavaToken != undefined) {
          // TODO Check it came from existing user. Otherwise this will fire for any transfer to this plugin's account
          if (true) {
            //TODO use currencyScale
            this.emit('money', senders[0], new BigNumber(coins[0].kavaToken).toString())
          }
        }
      }
    }
  }
}

module.exports = KavaPlugin
