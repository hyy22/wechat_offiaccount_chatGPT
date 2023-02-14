FROM node:18.13.0
WORKDIR /app
COPY . .
RUN npm install -g pm2 && npm install
EXPOSE 3000
VOLUME [ "/app/logs" ]
CMD [ "pm2-runtime", "/app/src/index.js" ]