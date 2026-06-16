FROM node:20-alpine

RUN apk add --no-cache postgresql-client bash

WORKDIR /app


COPY package*.json ./


RUN npm install


COPY . .


EXPOSE 3000

CMD ["sh", "-c", "npx tsx src/index.ts"]
