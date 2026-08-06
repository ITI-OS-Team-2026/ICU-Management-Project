# SmartCare ICU — backend container image
# Node 24 to match the version this app is developed against locally.
FROM node:24-slim

WORKDIR /app

# Prisma's query engine needs to detect the actual installed OpenSSL version
# at generate-time; node:24-slim doesn't ship openssl, so without this it
# silently guesses "openssl-1.1.x" and can generate the wrong engine binary.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies first so this layer is cached unless package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci

# Prisma v7+ requires prisma.config.ts at the project root alongside the prisma/ directory.
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

# Now the rest of the source.
COPY . .

# Persisted uploads (e.g. seeded/knowledge-base documents) live here — mount a
# volume at this path in docker-compose so files survive container recreation.
RUN mkdir -p uploads/documents

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
