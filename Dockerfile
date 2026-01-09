# Build Stage
FROM node:22-alpine as build

WORKDIR /app

# 프론트엔드 폴더의 package.json 복사
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# 프론트엔드 소스코드 복사
COPY frontend/ .

ARG VITE_KAKAO_MAP_KEY
ENV VITE_KAKAO_MAP_KEY=$VITE_KAKAO_MAP_KEY

RUN echo "VITE_KAKAO_MAP_KEY=$VITE_KAKAO_MAP_KEY" > .env
RUN npm run build

# Serve Stage
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
