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
  // Parse general cosmos sdk Coin strings. Spec is in cosmos-sdk/types/coin.go Coins.String()
  let coins = amountString.split(',').map(function (coinString) {
    let regexResult = coinString.match(/(^[0-9]+)(.*)$/)
    if (regexResult == null) {
      throw new Error('invalid coin string')
    }
    let coin = {}
    coin[regexResult[2]] = parseInt(regexResult[1])
    return coin // {coinType: amount}
  })

  // Check the same coin name doesn't come up twice
  let coinNames = _.flatten(coins.map(_.keys))
  if (coinNames.length != _.uniq(coinNames).length) {
    throw new Error('more than one instance of coin type in coin string')
  }

  return _.assign({}, ...coins)
}

module.exports = {
  extractTxTags,
  parseAmountString
}