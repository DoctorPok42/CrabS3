FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm install --save-dev @prisma/client prisma

COPY . .

RUN npx prisma generate && npm run build

RUN npm prune --production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
