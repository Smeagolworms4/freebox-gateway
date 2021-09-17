FROM node:lts-alpine

MAINTAINER Damien Duboeuf <smeagolworms4@gmail.com>

ADD src /app/src
ADD tsconfig.json /app/tsconfig.json
ADD package.json /app/package.json
ADD package-lock.json /app/package-lock.json

WORKDIR /app/

RUN npm install && npm run build && rm -r node_modules && npm install --only=prod

ENV HTTP_PORT=3333 \
	API_BASE_URL=http://mafreebox.freebox.fr/api

EXPOSE 3333

CMD node dist/index.js $HTTP_PORT $API_BASE_URL