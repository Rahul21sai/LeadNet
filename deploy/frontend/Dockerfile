FROM node:22-slim
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /srv
COPY server.mjs ./server.mjs
COPY public ./public
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
