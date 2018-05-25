const { RpcClient } = require('tendermint')
const client = RpcClient('ws://kava.connector.kava.io:46657')

// Get node status.
client.status({}).then(console.log)

// Subscribe to all transactions.
const listener = console.log
client.subscribe({query: "tm.event='Tx'"}, listener).then(() => {console.log('Succesfully subscribed!')}).catch(console.log)
// above promise will resolve on successful subscription
//When node sends along the event the listener is called with the data the event contains.
