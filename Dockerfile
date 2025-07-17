# Dockerfile (Solusi Final Paling Agresif)
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
COPY . .
RUN rm -rf node_modules
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
