FROM node:20-alpine AS builder

WORKDIR /app

# Install turbo
RUN npm install -g turbo

COPY . .
RUN turbo prune --scope=@scanflow/api --docker

# Install dependencies
FROM node:20-alpine AS installer
WORKDIR /app

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install

# Build the project
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN npx turbo run build --filter=@scanflow/api...

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=installer /app/ .

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
