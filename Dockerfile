FROM node:16

WORKDIR /usr/src/app
RUN chown -R node:node /usr/src/app

COPY --chown=node package*.json ./

RUN npm install
RUN chown -R node /usr/src/app/node_modules

COPY --chown=node . .

USER node

CMD [ "node", "./src/index.js" ]
