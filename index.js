const debug = require('debug')('ilp-plugin-kava')
const request = require('request-promise-native')
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
    let response = await request({
        method: 'GET',
        uri: this.kavaClientURI+`/accounts/${this.address}`,
        json: true // Automatically stringifies the body to JSON
    })
    let sequenceNumber = parseInt(response.value.sequence)
    debug(sequenceNumber)

    // Send payment.
    let paymentRequestOptions = {
        method: 'POST',
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

    return await request(paymentRequestOptions)
  }

  async getPaymentDetails (userId) {
    return {
      address: this.address
    }
  }
  
  async txEventHandler (response) {
    let tags = utils.extractTxTags(response)
    
    //TODO check interpretation of userID is correct
    //TODO check recipient and address have same format, maybe convert to make sure?
    //TODO make sure amount is typed properly, use assetScale
    //TODO check tx is valid - address is this one AND only one sender, receiver, (kava) amount
    
    if (txValid) {
      this.emit('money', this.address, new BigNumber(tags.amount).times(1e6).toString())
    }
  }
}

module.exports = KavaPlugin
