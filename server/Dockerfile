FROM balenalib/raspberrypi4-64-node

COPY src/ /usr/src/app

WORKDIR /usr/src/app

RUN npm install

CMD ["node", "app.js"]