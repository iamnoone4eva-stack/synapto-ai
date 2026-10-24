FROM node:20-alpine
WORKDIR /app

COPY synapto-backend/package.json ./synapto-backend/
WORKDIR /app/synapto-backend
RUN npm install --omit=dev || true

WORKDIR /app
COPY synapto-backend ./synapto-backend
COPY synapto-complete.html synapto-xai.html index.html manifest.webmanifest sw.js ./
COPY css ./css
COPY js ./js
COPY icons ./icons

WORKDIR /app/synapto-backend
ENV PORT=3001
ENV STATIC_DIR=/app
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.js"]
