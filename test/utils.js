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
        value: {'kavaToken': 10}
      },
      {
        key: "recipient",
        value: "CFCA4251FB4890778C8EDBAFDA81DF50A2155543"
      },
      {
        key: "amount",
        value: {'kavaToken': 10}
      }
    ]
    
    let tags = utils.extractTxTags(response)
    expect(tags).to.deep.equal(expectedTags)
  })
  
  it("parses amount strings correctly", function () {
    expect(utils.parseAmountString('100steak')).to.deep.equal({steak: 100})
    expect(utils.parseAmountString('100kavaToken')).to.deep.equal({kavaToken: 100})
    expect(utils.parseAmountString('12.34kavaToken')).to.deep.equal({'.34kavaToken': 12}) // no support for floats
    expect(utils.parseAmountString('100kavaToken,10steak')).to.deep.equal({kavaToken: 100, steak: 10})
    expect(utils.parseAmountString('0kavaToken')).to.deep.equal({kavaToken: 0})
    expect(utils.parseAmountString('123abc456xwyz')).to.deep.equal({abc456xwyz: 123})
    expect(utils.parseAmountString('123')).to.deep.equal({'': 123})
  })
  it("raises on invalid amount strings", function () {
    expect(() => utils.parseAmountString('kavaToken')).to.throw
    expect(() => utils.parseAmountString('')).to.throw
    expect(() => utils.parseAmountString('10kavaToken,45kavaToken')).to.throw
  })
})