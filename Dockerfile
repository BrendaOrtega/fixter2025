FROM node:20.11.1-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20.11.1-alpine AS production-dependencies-env
COPY ./prisma /app/
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev
# Install openssl for Prisma
RUN apk update && apk add openssl
RUN npx prisma generate

FROM node:20.11.1-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM node:20.11.1-alpine
# RUN apk update && apk add openssl
RUN apk update && apk add openssl
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/app/content /app/app/content
WORKDIR /app
CMD ["npm", "run", "start"]