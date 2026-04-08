FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server/ ./server/
COPY shared/ ./shared/
COPY tsconfig.json ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start"]