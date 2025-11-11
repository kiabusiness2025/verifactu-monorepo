FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
RUN ls -la
CMD ["npm", "run", "start"]
