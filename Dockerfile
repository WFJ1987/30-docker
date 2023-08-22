FROM node:16.20.0-alpine3.18

WORKDIR /app
COPY files/* /app/

EXPOSE 3000

RUN npm install &&\
    npm install -g pm2

CMD [ "node", "index.js" ]
