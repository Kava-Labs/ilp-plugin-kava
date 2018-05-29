const expect    = require('chai').expect
const utils = require('../utils.js')

describe("Utils", function () {
  it("extracts tags correctly", function () {
    //TODO fill in details
    let response = {
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
    }
    let expectedTags = [
      {
        key: "sender",
        value: "95F7D7E70F262927A81739B4268C53EC1BB01813"
      },
      {
        key: "amount",
        value: 10
      },
      {
        key: "recipient",
        value: "CFCA4251FB4890778C8EDBAFDA81DF50A2155543"
      },
      {
        key: "amount",
        value: 10
      }
    ]
    
    let tags = utils.extractTxTags(response)
    expect(tags).to.deep.equal(expectedTags)
  })
  
  it("parses amount strings correctly", function () {
    expect(utils.parseAmountString('100kavaToken')).to.equal(100)
  })
})