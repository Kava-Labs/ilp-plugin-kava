const chai = require('chai')
chai.use(require("chai-as-promised"))
const expect = chai.expect
const nock = require('nock')

const KavaPlugin = require('..')

describe('Plugin sendPayment', function () {
  
  it('calls the correct endpoints', async function () {
    let kavaClientURI = 'http://localhost:1317'
    //let fromAddress = 'BA77CDE4E719539FFEF0852E886C4B085C4F4208'
    let fromAddress = "cosmosaccaddr1rwqpapcdy5umkt9qr92hn6p5xpqytrymunp4mu" //validator
    let toAddress = "cosmosaccaddr178u6uguaafh66qz6pwe95jgxnwt57qhke50da4" //user1
    //'909AF435C706D9D77AD14C2508C001C0F137AB72'
    let accountName = 'accountName'
    let accountPassword = 'password'
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
        type: "6C54F73C9F2E08",
        value: {
          address: "1B801E870D2539BB2CA0195579E8343040458C9B",
          coins: [{denom: "KVA",amount: 10000000000}],
          public_key: null,
          account_number: 0,
          sequence: 0,
        }
      })
    
    let sendMoneyCall = nock(kavaClientURI)
      .post(`/accounts/${toAddress}/send`, {
        amount: [
          {denom: "KVA", "amount": amount}
        ],
        name: accountName,
        password: accountPassword,
        chain_id: "test-kava",
        account_number: 0,
        sequence: 0,
      })
      .reply(200)
      
    await kp.sendPayment({kavaAddress: toAddress}, amount) // no required return value
      
    getSequenceCall.done() // throws an assertion error if the endpoint was not called
    sendMoneyCall.done()
  })
  
  it('raises when sending money fails', function () {
    let kavaClientURI = 'http://localhost:1317'
    let fromAddress = "cosmosaccaddr1rwqpapcdy5umkt9qr92hn6p5xpqytrymunp4mu" //validator
    let toAddress = "cosmosaccaddr178u6uguaafh66qz6pwe95jgxnwt57qhke50da4" //user1
    let accountName = 'accountName'
    let accountPassword = 'password'
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
        type: "6C54F73C9F2E08",
        value: {
          address: "1B801E870D2539BB2CA0195579E8343040458C9B",
          coins: [{denom: "KVA",amount: 10000000000}],
          public_key: null,
          account_number: 0,
          sequence: 0,
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
    // Setup plugin
    let kavaClientURI = "http://localhost:1317"
    let kp = new KavaPlugin({
      kavaAddress: "cosmosaccaddr178u6uguaafh66qz6pwe95jgxnwt57qhke50da4",
      kavaClientURI
    })
    
    // End test when money event is emitted
    kp.on("money", () => {
      done()
    })
    
    // Mock the decode tx api
    let txbase64 = "/QHwYl3rDyosh/sOAwEKFBuAHocNJTm7LKAZVXnoNDBARYybFgMBCgNLVkERAAAAAAAAAGQEBBYDAQoU8fmuI53qb60AWguyWkkGm5dPAvYWAwEKA0tWQREAAAAAAAAAZAQEBBMOAwERAAAAAAAAAAAEEQAAAAAAAw1ABB4DAQ8WJN5iIPVCazHdZ/LxPzJaz9j925tTMexvf96/US7XZgShzU3XFz2h2ypAuY8oc+7zeEA8NNKNMncfBZhjPf/y51ly78CjtUjTp2KXmmb0Yz+EYMYfr2wnxkuLsIQRU5GFfTW8kv2pTbVvBhkAAAAAAAAAACEAAAAAAAAAAgQE"
    let decodeTxCall = nock(kavaClientURI)
      .post("/decode_tx", {
        txbase64: txbase64
      })
      .reply(200, {
        "type": "8EFE47F0625DE8",
        "value": {
          "msg": {
            "type": "EAFDE32A2C87F8",
            "value": {
              "inputs": [{
                "address": "1B801E870D2539BB2CA0195579E8343040458C9B",
                "coins": [{
                  "denom": "KVA",
                  "amount": 100
                }]
              }],
              "outputs": [{
                "address": "F1F9AE239DEA6FAD005A0BB25A49069B974F02F6",
                "coins": [{
                  "denom": "KVA",
                  "amount": 100
                }]
              }]
            }
          },
          "fee": {
            "amount": [{
              "denom": "",
              "amount": 0
            }],
            "gas": 200000
          },
          "signatures": [
          {
            "pub_key": {
              "type": "AC26791624DE60",
              "value": "9UJrMd1n8vE/MlrP2P3bm1Mx7G9/3r9RLtdmBKHNTdc="
            },
            "signature": {
              "type": "6BF5903DA1DB28",
              "value": "uY8oc+7zeEA8NNKNMncfBZhjPf/y51ly78CjtUjTp2KXmmb0Yz+EYMYfr2wnxkuLsIQRU5GFfTW8kv2pTbVvBg=="
            },
            "account_number": 0,
            "sequence": 2
          }
          ]
        }
      })

    // Call the handler that's called when a tx is received from the node
    kp.txEventHandler({
      TxResult: {
        height: 665,
        index: 0,
        tx: txbase64,
        result: {
          gas_used: 2724,
          tags: [{
            key: "c2VuZGVy",
            value: "MUI4MDFFODcwRDI1MzlCQjJDQTAxOTU1NzlFODM0MzA0MDQ1OEM5Qg=="
          },
          {
            key: "cmVjaXBpZW50",
            value: "RjFGOUFFMjM5REVBNkZBRDAwNUEwQkIyNUE0OTA2OUI5NzRGMDJGNg=="
          }],
          fee: {}
        }
      }
    })

    expect()
    
    
  })
})