const _ = require('lodash')
const debug = require('debug')('ilp-plugin-kava')
  
function extractTxTags (response) {
  let encodedTxTags = response.TxResult.result.tags
  // encodedTxTags is an array of objects {key: 'base64String', value: 'base64String'}
  return encodedTxTags.map(parseTxTag)
}

function parseTxTag(txTag) {
  // Decode values from base64
  txTag = _.mapValues(txTag, base64ToBuffer)
  // Keys are always strings
  txTag.key = txTag.key.toString()
  // Encode value depending on key
  switch (txTag.key) {
  case 'sender':
  case 'recipient':
    txTag.value = txTag.value.toString('hex').toUpperCase()
    break
  case 'amount':
    txTag.value = parseAmountString(txTag.value.toString())
    break
  }
  return txTag
}

function base64ToBuffer (base64String) {
  return new Buffer.from(base64String, 'base64')
}

function parseAmountString (amountString) {
  //TODO parse general cosmos sdk Coin strings
  // Spec is in cosmos-sdk/types/coin.go Coins.String()
  // Something like this
  //coinString.split(',').map((s) => s.match(/([0-9]+)([^0-9]+)/))
  return parseInt(amountString.split('kavaToken')[0])
}

module.exports = {
  extractTxTags,
  parseAmountString
}