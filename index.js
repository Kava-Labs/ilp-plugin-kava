const debug = require('debug')('ilp-plugin-kava')
const request = require('request-promise-native')
const BigNumber = require('bignumber.js')
const PluginPayment = require('ilp-plugin-payment')
const { RpcClient } = require('tendermint')

const utils = require('./utils.js')

class KavaPlugin extends PluginPayment {
  constructor (opts) {
    //TODO fill out all opts here
    // role: client|server
    // address: kavaAddress
    // kavaNodeURI: url:port
    // kavaAccountName
    // kavaAccountPassword
    // kavaClientURI
    super(opts)
    this.kavaNode = RpcClient(opts.kavaNodeURI || 'ws://kava.connector.kava.io:46657')
    this.address = opts.address
    this.kavaAccountName = opts.kavaAccountName
    this.kavaAccountPassword = opts.kavaAccountPassword
    this.kavaClientURI = opts.kavaClientURI
  }

  async connectPayment () {
    //TODO setup account through LCD if not there already
    await this.kavaNode.subscribe({query: "tm.event='Tx'"}, this.txEventHandler)
    debug('Succesfully subscribed to Kava node.')
  }

  async sendPayment (details, amount) {
    //TODO set up LCD on server
    // Get sequence number for sending account.
    let response = await request.get({
        uri: this.kavaClientURI+`/accounts/${this.address}`,
        json: true // Automatically stringifies the body to JSON
    })
    let sequenceNumber = parseInt(response.value.sequence)
    debug(sequenceNumber)

    // Send payment.
    let paymentPostData = {
        uri: this.kavaClientURI+`/accounts/${details.address}/send`,
        body: {
          amount: [
            {denom: "kavaToken", "amount": amount}
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
            //TODO use assetScale
            this.emit('money', senders[0], new BigNumber(coins[0].kavaToken).toString())
          }
        }
      }
    }
  }
}

module.exports = KavaPlugin
