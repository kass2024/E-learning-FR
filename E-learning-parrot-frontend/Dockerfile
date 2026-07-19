# Production frontend — Vite build + nginx (no cPanel static upload)
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_APP_NAME="Xander Learning Hub"
ARG VITE_APP_VERSION=1.0.0
ARG VITE_APP_BUILD_ID
ARG VITE_GOOGLE_MAPS_EMBED_KEY
ARG VITE_PCLOUD_BASE_URL=https://api.pcloud.com

ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_APP_BUILD_ID=$VITE_APP_BUILD_ID \
    VITE_GOOGLE_MAPS_EMBED_KEY=$VITE_GOOGLE_MAPS_EMBED_KEY \
    VITE_PCLOUD_BASE_URL=$VITE_PCLOUD_BASE_URL \
    NODE_OPTIONS=--max-old-space-size=4096

RUN npm run build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
