# Stage 1: Get mongodump from official MongoDB image
FROM mongo:7 AS mongo-tools

# Stage 2: Development dependencies
FROM node:20.11.1-alpine AS development-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate

# Stage 3: Production dependencies
FROM node:20.11.1-alpine AS production-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN apk update && apk add openssl
RUN npx prisma generate

# Stage 4: Build
FROM node:20.11.1-alpine AS build-env
WORKDIR /app
COPY --from=development-dependencies-env /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 5: Production
FROM node:20.11.1-alpine
RUN apk update && apk add openssl libc6-compat krb5-libs
COPY --from=mongo-tools /usr/bin/mongodump /usr/local/bin/mongodump
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=production-dependencies-env /app/node_modules ./node_modules
COPY --from=build-env /app/build ./build
COPY --from=build-env /app/app/content ./app/content
RUN chmod +x /app/node_modules/@ffmpeg-installer/linux-x64/ffmpeg || true
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]
