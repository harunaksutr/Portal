FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./
RUN mkdir -p /app/public

COPY *.html /app/public/

EXPOSE 3000

CMD ["node", "server.js"]
