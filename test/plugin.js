const chai = require('chai')
chai.use(require("chai-as-promised"))
const expect = chai.expect
const nock = require('nock')

const KavaPlugin = require('..')

describe('Plugin sendPayment', function () {
  
  it('calls the correct endpoints', async function () {
    let kavaClientURI = 'http://localhost:1317'
    let fromAddress = 'BA77CDE4E719539FFEF0852E886C4B085C4F4208'
    let toAddress = '909AF435C706D9D77AD14C2508C001C0F137AB72'
    let accountName = 'accountName'
    let accountPassword = 'password'
    let sequenceNumber = 23
    let amount = 10
    
    kp = new KavaPlugin({
      kavaAddress: fromAddress,
      kavaClientURI: kavaClientURI,
      kavaAccountName: accountName,
      kavaAccountPassword: accountPassword,
    })
    
    let getSequenceCall = nock(kavaClientURI)
      .get(`/accounts/${fromAddress}`)
      .reply(200, {
        type:"6C54F73C9F2E08",
        value:{
          kavaAddress: fromAddress,
          coins:[
            {denom:"kavaToken",amount:970},
            {denom:"steak","amount":50}
          ],
          public_key:{
            type:"AC26791624DE60",
            value:"c+6LVV2cTLN+KlBVijjcUNGXhd9Tt8NdNK2I6air2Y4="
          },
          sequence: sequenceNumber
        }
      })
    
      let sendMoneyCall = nock(kavaClientURI)
        .post(`/accounts/${toAddress}/send`, {
          amount: [
            {denom: "kavaToken", "amount": amount}
          ],
          name: accountName,
          password: accountPassword,
          chain_id: 'kava',
          sequence: sequenceNumber
        })
        .reply(200)
      
      await kp.sendPayment({kavaAddress: toAddress}, amount) // no required return value
      
      getSequenceCall.done() // throws an assertion error if the endpoint was not called
      sendMoneyCall.done()
  })
  
  it('raises when sending money fails', function () {
    let kavaClientURI = 'http://localhost:1317'
    let fromAddress = 'BA77CDE4E719539FFEF0852E886C4B085C4F4208'
    let toAddress = '909AF435C706D9D77AD14C2508C001C0F137AB72'
    let accountName = 'accountName'
    let accountPassword = 'password'
    let sequenceNumber = 23
    let amount = 10
    
    kp = new KavaPlugin({
      kavaAddress: fromAddress,
      kavaClientURI: kavaClientURI,
      kavaAccountName: accountName,
      kavaAccountPassword: accountPassword,
    })
    
    let getSequenceCall = nock(kavaClientURI)
      .get(`/accounts/${fromAddress}`)
      .reply(200, {
        type:"6C54F73C9F2E08",
        value:{
          address: fromAddress,
          coins:[
            {denom:"kavaToken",amount:970},
            {denom:"steak","amount":50}
          ],
          public_key:{
            type:"AC26791624DE60",
            value:"c+6LVV2cTLN+KlBVijjcUNGXhd9Tt8NdNK2I6air2Y4="
          },
          sequence: sequenceNumber
        }
      })
    
    let sendMoneyCall = nock(kavaClientURI)
      .post(`/accounts/${toAddress}/send`)
      .reply(500)
      
    expect(kp.sendPayment({kavaAddress: toAddress}, amount)).to.be.rejected
  })
})

describe('Plugin txEventHandler', function () {
  it('emits a money event when there is a relevant transaction', function (done) {
    let kp = new KavaPlugin({kavaAddress: 'CFCA4251FB4890778C8EDBAFDA81DF50A2155543'})
    
    kp.on('money', () => {
      done()
    })
    
    kp.txEventHandler({
      TxResult: {
        result: {
          tags: [
            {
              "key": "c2VuZGVy",
              "value": "lffX5w8mKSeoFzm0JoxT7BuwGBM="
            },
            {
              "key": "YW1vdW50",
              "value": "MTBrYXZhVG9rZW4="
            },
            {
              "key": "cmVjaXBpZW50",
              "value": "z8pCUftIkHeMjtuv2oHfUKIVVUM="
            },
            {
              "key": "YW1vdW50",
              "value": "MTBrYXZhVG9rZW4="
            }
          ]
        }
      }
    })
    
  })
})