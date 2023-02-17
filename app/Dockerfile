## this is the stage one , also know as the build step
FROM node:16.17.1-alpine3.15 AS builder
WORKDIR /usr
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
RUN ls -a && npm install && npm run build


## this is stage two , where the app actually runs
FROM node:16.17.1-alpine3.15 AS final
ENV NODE_ENV=production
WORKDIR /usr/app
COPY package.json ./
RUN npm install --only=production && npm install pm2 -g
COPY --from=builder /usr/dist .
EXPOSE 80
CMD ["pm2-runtime","src/server.js"]