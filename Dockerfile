FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/mcp/package.json ./packages/mcp/
COPY apps/server/package.json ./apps/server/
COPY apps/studio/package.json ./apps/studio/

RUN npm ci

COPY . .

RUN npm run build

ENV PORT=4310
ENV OPENCRAFT_DATA_DIR=/app/data

EXPOSE 4310

VOLUME ["/app/data"]

CMD ["node", "apps/server/src/index.mjs"]
