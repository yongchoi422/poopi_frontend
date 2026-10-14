FROM node:24-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html lighthouse.html vite.config.js ./
COPY testnet ./testnet
COPY scripts/sale-lab-plugin.mjs ./scripts/sale-lab-plugin.mjs
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server --omit=dev --no-audit --no-fund
COPY server/*.mjs ./server/
COPY src/lighthouse/sanctuary.mjs ./src/lighthouse/sanctuary.mjs
COPY src/lighthouse/market-world.mjs ./src/lighthouse/market-world.mjs
COPY --from=web /app/dist ./dist
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health/live',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
