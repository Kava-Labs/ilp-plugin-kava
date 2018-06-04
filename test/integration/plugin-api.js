const chai = require('chai')
chai.use(require("chai-as-promised"))
const expect = chai.expect
const getPort = require('get-port')
const request = require('request-promise-native')
const Store = require('ilp-store-memory')
const ILDCP = require('ilp-protocol-ildcp')
const KavaPlugin = require('../..')
const IlpPacket = require('ilp-packet')

/*
  These tests require a kava node and light client running on localhost, on ports 46657 and 1317 repectively.
  They also require accounts to be set up on the light client.
*/

const timeout = ms => new Promise(res => setTimeout(res, ms))

async function getAccountBalance(kavaClientURI, kavaAddress) {
  let response = await request.get({
    uri: kavaClientURI+`/accounts/${kavaAddress}`,
    json: true
  })
  return response.value.coins.filter((coin) => coin.denom == 'kavaToken')[0].amount
}


describe('Test minimal plugin API.', function () {
  
  before(async function () {
    let port = await getPort()
    this.serverIlpAddress = 'test'
    this.serverPlugin = new KavaPlugin({
      role: 'server',
      port: port,
      kavaNodeURI: 'ws://localhost:46657',
      kavaClientURI: 'http://localhost:1317',
      kavaAccountName: 'validator',
      kavaAccountPassword: 'password',
      kavaAddress: '4AF13FDB4DC0FF2D8D09F39527C3141E0DCC3B77',
      currencyScale: 1,
      settleThreshold: 0,
      _store: new Store()
    })
    this.serverPlugin.registerDataHandler(() => Promise.resolve(ILDCP.serializeIldcpResponse({
      clientAddress: this.serverIlpAddress,
      assetScale: 1,
      assetCode: 'KVA',
    })))
    
    this.clientUsername = 'user'
    this.clientPlugin = new KavaPlugin({
      role: 'client',
      server: `btp+ws://${this.clientUsername}:password@localhost:${port}`,
      kavaNodeURI: 'ws://localhost:46657',
      kavaClientURI: 'http://localhost:1317',
      kavaAccountName: 'user1',
      kavaAccountPassword: 'password',
      kavaAddress: 'A95031C2A61EB47212F725EA342B52BA8DB1B344',
    })
    //this.clientPlugin.registerDataHandler((data) => Promise.resolve(`thanks for ${data}`))
  })
  
  it('server plugin connects', async function () {
    expect(this.serverPlugin.isConnected()).to.be.false
    await this.serverPlugin.connect()
    expect(this.serverPlugin.isConnected()).to.be.true
  })
  
  it('client plugin connects to the server plugin', async function () {
    expect(this.clientPlugin.isConnected()).to.be.false
    await this.clientPlugin.connect()
    expect(this.clientPlugin.isConnected()).to.be.true
  })
  
  it('client sends money', async function () {
    // Set the timeout for this test.
    this.timeout(5000)
    
    // Get current balance of server plugin kava account.
    let previousBalance = await getAccountBalance(this.serverPlugin.kavaClientURI, this.serverPlugin.kavaAddress)
    
    this.serverPlugin.deregisterDataHandler()
    this.serverPlugin.deregisterMoneyHandler()
    this.serverPlugin.registerMoneyHandler(() => {}) // register empty handler
    
    let amountToSend = 1
    let sendMoneyResponse = await this.clientPlugin.sendMoney(amountToSend)
    
    // wait until transaction has gone through
    await timeout(3000)
    
    // Get new balance of server plugin kava account.
    let newBalance = await getAccountBalance(this.serverPlugin.kavaClientURI, this.serverPlugin.kavaAddress)
    
    expect(sendMoneyResponse).to.be.undefined
    expect(previousBalance + parseInt(amountToSend)).to.equal(newBalance)
  })
  
  it('client sends data', async function () {
    let preparePacket = IlpPacket.serializeIlpPrepare({
      amount: '10',
      executionCondition: new Buffer.alloc(32), // IlpPacket requires 32 byte buffers as condition
      expiresAt: new Date(),
      destination: 'test.blarg',
      data: new Buffer.alloc(0) //empty buffer
    })
    let fulfillmentPacket = IlpPacket.serializeIlpFulfillment({
      data: new Buffer.alloc(0)
    })
    this.serverPlugin.deregisterMoneyHandler()
    this.serverPlugin.deregisterDataHandler()
    this.serverPlugin.registerDataHandler((data) => fulfillmentPacket)
    
    response = await this.clientPlugin.sendData(preparePacket)
    expect(response).to.deep.equal(fulfillmentPacket)
  })
  
  it('client fetches ilp address from server', async function () {
    let ILDCPResponse = await ILDCP.fetch(this.clientPlugin.sendData.bind(this.clientPlugin))
    expect(ILDCPResponse.clientAddress).to.not.be.undefined
  })
  
  it('server sends data', async function () {
    let preparePacket = IlpPacket.serializeIlpPrepare({
      amount: '1',
      executionCondition: new Buffer.alloc(32), // IlpPacket requires 32 byte buffers as condition
      expiresAt: new Date(),
      destination: `${this.serverIlpAddress}.${this.clientUsername}`,
      data: new Buffer.alloc(0) //empty buffer
    })
    let fulfillmentPacket = IlpPacket.serializeIlpFulfillment({
      data: new Buffer.alloc(0)
    })
    this.clientPlugin.deregisterMoneyHandler()
    this.clientPlugin.deregisterDataHandler()
    this.clientPlugin.registerDataHandler((data) => fulfillmentPacket)
    
    response = await this.serverPlugin.sendData(preparePacket)
    expect(response).to.deep.equal(fulfillmentPacket)
  })
  
  it('server settles money', async function () {
    this.timeout(5000)
    //TODO this might conflict with the above test, split up tests
    
    // Get current balance
    let previousBalance = await getAccountBalance(this.clientPlugin.kavaClientURI, this.clientPlugin.kavaAddress)
    
    // Send a prepare packet
    let amountToSend = '1'
    let preparePacket = IlpPacket.serializeIlpPrepare({
      amount: amountToSend,
      executionCondition: new Buffer.alloc(32), // IlpPacket requires 32 byte buffers as condition
      expiresAt: new Date(),
      destination: `${this.serverIlpAddress}.${this.clientUsername}`,
      data: new Buffer.alloc(0) //empty buffer
    })
    let fulfillmentPacket = IlpPacket.serializeIlpFulfillment({
      data: new Buffer.alloc(0) //empty buffer
    })
    this.clientPlugin.deregisterMoneyHandler()
    this.clientPlugin.registerMoneyHandler(async () => {}) // don't need to return anything, probably
    this.clientPlugin.deregisterDataHandler()
    this.clientPlugin.registerDataHandler((data) => fulfillmentPacket)
    
    response = await this.serverPlugin.sendData(preparePacket)
    
    // wait until the transaction has gone through
    await timeout(3000)
    
    // Get new balance
    let newBalance = await getAccountBalance(this.clientPlugin.kavaClientURI, this.clientPlugin.kavaAddress)
    
    expect(previousBalance + parseInt(amountToSend)).to.equal(newBalance)
  })
  
  it('client plugin disconnects', async function () {
    expect(this.clientPlugin.isConnected()).to.be.true
    await this.clientPlugin.disconnect()
    expect(this.clientPlugin.isConnected()).to.be.false
  })
  
  it('server plugin disconnects', async function () {
    expect(this.serverPlugin.isConnected()).to.be.true
    await this.serverPlugin.disconnect()
    expect(this.serverPlugin.isConnected()).to.be.false
  })
})