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
  These tests require a kava node and light client running somewhere, on ports 46657 and 1317 repectively.
  They also require accounts to be set up on the light client.
*/

const asyncSleep = ms => new Promise(res => setTimeout(res, ms))

async function getAccountBalance(kavaClientURI, kavaAddress) {
  // Fetch the balance of a kava address from the light client.
  let response = await request.get({
    uri: kavaClientURI+`/accounts/${kavaAddress}`,
    json: true
  })
  return response.value.coins.filter((coin) => coin.denom == 'kavaToken')[0].amount
}


describe('Minimal Plugin API.', function () {
  this.timeout(20*1000) // slow internet allowance
  
  before(async function () {
    let port = await getPort()
    this.serverIlpAddress = 'test'
    this.serverPlugin = new KavaPlugin({
      role: 'server',
      port: port,
      kavaNodeURI: 'ws://kvd.connector.kava.io:46657',
      kavaClientURI: 'http://kvcli.connector.kava.io:1317',
      kavaAccountName: 'validator',
      kavaAccountPassword: 'password',
      kavaAddress: 'C6DE0B42B50F37CCB47D167166628741AD7FE7C5',
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
      kavaNodeURI: 'ws://kvd.connector.kava.io:46657',
      kavaClientURI: 'http://kvcli.connector.kava.io:1317',
      kavaAccountName: 'user1',
      kavaAccountPassword: 'password',
      kavaAddress: '5AA8D4F6241BA6796FC73EC3D55C7CF77B5F33CF',
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
    // Get current balance of server plugin kava account.
    let previousBalance = await getAccountBalance(this.serverPlugin.kavaClientURI, this.serverPlugin.kavaAddress)
    
    this.serverPlugin.deregisterDataHandler()
    this.serverPlugin.deregisterMoneyHandler()
    this.serverPlugin.registerMoneyHandler(() => {}) // register empty handler
    
    let amountToSend = 1
    let sendMoneyResponse = await this.clientPlugin.sendMoney(amountToSend)
    
    // wait until transaction has gone through
    await asyncSleep(3000)
    
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
    let fulfillPacket = IlpPacket.serializeIlpFulfill({
      fulfillment: new Buffer.alloc(32), // IlpPacket requires 32 bytes buffers as fulfillments
      data: new Buffer.alloc(0)
    })

    this.serverPlugin.deregisterDataHandler()
    this.serverPlugin.registerDataHandler((data) => fulfillPacket)
    
    response = await this.clientPlugin.sendData(preparePacket)
    expect(response).to.deep.equal(fulfillPacket)
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
    let fulfillPacket = IlpPacket.serializeIlpFulfill({
      fulfillment: new Buffer.alloc(32), // IlpPacket requires 32 bytes buffers as fulfillments
      data: new Buffer.alloc(0)
    })
    this.clientPlugin.deregisterMoneyHandler()
    this.clientPlugin.deregisterDataHandler()
    this.clientPlugin.registerDataHandler((data) => fulfillPacket)
    
    response = await this.serverPlugin.sendData(preparePacket)
    expect(response).to.deep.equal(fulfillPacket)
  })
  
  it('server settles money', async function () {
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
    let fulfillPacket = IlpPacket.serializeIlpFulfill({
      fulfillment: new Buffer.alloc(32), // IlpPacket requires 32 bytes buffers as fulfillments
      data: new Buffer.alloc(0)
    })
    this.clientPlugin.deregisterMoneyHandler()
    this.clientPlugin.registerMoneyHandler(async () => {}) // don't need to return anything, probably
    this.clientPlugin.deregisterDataHandler()
    this.clientPlugin.registerDataHandler((data) => fulfillPacket)
    
    response = await this.serverPlugin.sendData(preparePacket)
    
    // wait until the transaction has gone through
    await asyncSleep(3000)
    
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