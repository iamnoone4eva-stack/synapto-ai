FROM node:20-alpine
WORKDIR /app
COPY synapto-backend ./synapto-backend
COPY synapto-xai.html index.html manifest.webmanifest sw.js ./
COPY css ./css
COPY js ./js
COPY icons ./icons
WORKDIR /app/synapto-backend
ENV PORT=3001
ENV STATIC_DIR=/app
EXPOSE 3001
CMD ["node", "server.js"]
