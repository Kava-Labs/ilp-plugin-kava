FROM kava/kava
WORKDIR $HOME/init-data
# copy in initalisation data
COPY init-data/ ./init-data/
COPY init.sh ./
# run init script to set up test data inside the container
RUN ["sh", "init.sh"]
