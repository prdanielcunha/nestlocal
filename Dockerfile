FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server.mjs ./
COPY src/domain ./src/domain
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
