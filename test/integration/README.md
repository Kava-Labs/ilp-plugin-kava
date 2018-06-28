Integration tests that rely on a configured node and light client running on localhost.

To run:

 - In one window `docker-compose up --force-recreate`
 - In another `npm test test/integration`

Explanation of files:

 - `docker-compose.yml` sets up a node and light client
 - `init.sh` an initialisation script to setup kvd and kvcli
 - `Dockerfile` specifies the image for the node and light client - it pulls from docker hub, then adds test data, then initialises kvd and kvcli
 - `init-data/` contains test data for the node and light client