FROM node:10.15.3

WORKDIR /app

COPY package.json /app

RUN npm install
RUN npm install slimerjs -g

RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get -y install libc6 libstdc++6 libgcc1 libgtk2.0-0 libgtk3.0 libasound2 libxrender1 libdbus-glib-1-2

RUN wget https://ftp.mozilla.org/pub/firefox/releases/56.0/linux-x86_64/en-GB/firefox-56.0.tar.bz2
RUN tar -jxvf ./firefox-56.0.tar.bz2

ENV SLIMERJSLAUNCHER="./firefox/firefox"

COPY parser.js /app
COPY index.js /app

CMD ["node", "index.js"]
