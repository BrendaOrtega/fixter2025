# syntax=docker/dockerfile:1.7
#
# Un solo `npm ci` y un solo `prisma generate`.
#
# Antes había dos árboles de dependencias completos —uno para construir y otro
# para producción— instalados por separado. Instalar dos veces lo mismo cuesta
# el doble y no ahorra nada: las de producción son un subconjunto de las de
# desarrollo, así que se instalan una vez y al final se podan con `npm prune`.
#
# Los `--mount=type=cache` guardan el caché de npm ENTRE builds: la primera vez
# no cambia nada, de la segunda en adelante se salta la descarga completa.

# Stage 1: mongodump, que se copia tal cual a la imagen final
FROM mongo:7 AS mongo-tools

# Stage 2: dependencias + build
FROM node:20.11.1-alpine AS build-env
WORKDIR /app
RUN apk add --no-cache openssl

# package.json y prisma primero: mientras no cambien, esta capa se reusa y el
# `npm ci` ni se ejecuta. Copiar el código antes tiraba el caché en cada commit.
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN --mount=type=cache,target=/root/.npm npm ci
RUN npx prisma generate

COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
# El caché de Vite sobrevive entre builds: no vuelve a transformar los módulos
# que no cambiaron, que en este proyecto son casi todos.
RUN --mount=type=cache,target=/app/node_modules/.vite \
    --mount=type=cache,target=/root/.cache \
    npm run build

# Las de producción salen de podar las que ya están, no de instalarlas de nuevo.
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev && npx prisma generate

# Stage 3: la imagen que corre
FROM node:20.11.1-alpine
RUN apk add --no-cache openssl libc6-compat krb5-libs
COPY --from=mongo-tools /usr/bin/mongodump /usr/local/bin/mongodump
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=build-env /app/node_modules ./node_modules
COPY --from=build-env /app/build ./build
COPY --from=build-env /app/app/content ./app/content
RUN chmod +x /app/node_modules/@ffmpeg-installer/linux-x64/ffmpeg || true
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]
