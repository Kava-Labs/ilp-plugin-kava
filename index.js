const asyncModule = require("async");
const request = require('request-promise-native')
const PluginPayment = require('ilp-plugin-payment')

class KavaPlugin extends PluginPayment {
  constructor (opts) {
    // role: client|server
    // address: kavaAddress
    // kavaServer: url:port
    // kavaAccountName
    // kavaAccountPassword
    super(opts)
    this.address = opts.address
    this.kavaAccountName = opts.kavaAccountName
    this.kavaAccountPassword = opts.kavaAccountPassword
    this.kavaServer = opts.kavaServer
  }

  async connectPayment () {
    // Called during plugin.connect()
    let requestOptions = async (height) => {
        uri: this.kavaServer+`/blocks/${height}`,
        json: true
    }
    const checkBalance = async (next) => {
      response = await request(requestOptions)
      response.value.coins[0].amount
      // TODO check if amount has changed and call .emit('money')
    }
    asyncModule.forever(checkBalance, (err) => console.log(err))
  }

  async sendPayment (details, amount) {
    var requestOptions = {
        method: 'POST',
        uri: this.kavaServer+`/accounts/${details.address}/send`,
        body: {
          amount: amount,
          name: this.kavaAccountName,
          password: this.kavaAccountPassword,
          chain_id: 'kava',
          sequence: 0 //TODO how will this work?
        },
        json: true // Automatically stringifies the body to JSON
    };
 
    let parsedBody = await request(requestOptions)
  }

  async getPaymentDetails (userId) {
    return {
      address: this.address
    }
  }
}

module.exports = KavaPlugin