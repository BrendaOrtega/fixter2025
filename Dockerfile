# Stage 1: Get mongodump from official MongoDB image
FROM mongo:7 AS mongo-tools

# Stage 2: Development dependencies
FROM node:20.11.1-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

# Stage 3: Production dependencies
FROM node:20.11.1-alpine AS production-dependencies-env
COPY ./prisma /app/
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev
# Install openssl for Prisma
RUN apk update && apk add openssl
RUN npx prisma generate

# Stage 4: Build
FROM node:20.11.1-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

# Stage 5: Production
FROM node:20.11.1-alpine
# Install openssl, libc6-compat (for mongodump), and system deps
RUN apk update && apk add openssl libc6-compat
# Copy mongodump from MongoDB image
COPY --from=mongo-tools /usr/bin/mongodump /usr/local/bin/mongodump
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/app/content /app/app/content
# Ensure ffmpeg binary from npm package is executable
RUN chmod +x /app/node_modules/@ffmpeg-installer/linux-x64/ffmpeg || true
WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]