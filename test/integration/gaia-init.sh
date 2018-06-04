gaiadVolume="/Users/ruaridh/Projects/Twenty-X/ilp-plugin-kava/test/integration/.gaiad"
gaiacliVolume="/Users/ruaridh/Projects/Twenty-X/ilp-plugin-kava/test/integration/.gaiacli"


# Init Chain

rm -rf $gaiadVolume
rm -rf $gaiacliVolume

# Init chain
docker run --rm -v $gaiadVolume:/root/.gaiad -v $gaiacliVolume:/root/.gaiacli kava/cosmos-sdk:ilp-demo gaiad init --chain-id kava --name kava

# Need to copy validator backup phrase over



# Init Accounts

validatorBackupPhrase=""
password="password"

# create validator keys
docker run --rm -v $gaiadVolume:/root/.gaiad -v $gaiacliVolume:/root/.gaiacli kava/cosmos-sdk:ilp-demo sh -c "printf '$password\n$validatorBackupPhrase\n' | gaiacli keys add --recover validator"

# create ruaridh keys
docker run --rm -v $gaiadVolume:/root/.gaiad -v $gaiacliVolume:/root/.gaiacli kava/cosmos-sdk:ilp-demo sh -c "printf '$password\n' | gaiacli keys add user1"

# Need to copy user1 address to send coins



# Send Coins

user1Address=""

# start node
docker run --rm -v $gaiadVolume:/root/.gaiad -v $gaiacliVolume:/root/.gaiacli -p 46657:46657 kava/cosmos-sdk:ilp-demo gaiad start

# send coins
docker run --rm -v $gaiadVolume:/root/.gaiad -v $gaiacliVolume:/root/.gaiacli --net host kava/cosmos-sdk:ilp-demo sh -c "printf '$password\n' | gaiacli send --name validator --to $user1Address --amount 100kavaToken --chain-id kava --node localhost:46657"
