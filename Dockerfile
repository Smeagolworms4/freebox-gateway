FROM node:lts-alpine

MAINTAINER Damien Duboeuf <smeagolworms4@gmail.com>

ADD src /app/src
ADD tsconfig.json /app/tsconfig.json
ADD package.json /app/package.json
ADD package-lock.json /app/package-lock.json

WORKDIR /app/

RUN npm install && npm run build && rm -r node_modules && npm install --only=prod

ENV HTTP_PORT=3333 \
	API_BASE_URL=http://mafreebox.freebox.fr/api \
	APP_ID=fr.freebox_gateway \
	APP_NAME="Freebox Gateway" \
	APP_VERSION=1.0.0 \
	DEVICE_NAME="Freebox Gateway"

EXPOSE 3333

CMD node dist/index.js \
   --http-port=$HTTP_PORT \
   --base-url=$API_BASE_URL \
   --app-id=$APP_ID \
   --app-name=$APP_NAME \
   --app-version=$APP_VERSION \
   --device-name=$DEVICE_NAME \