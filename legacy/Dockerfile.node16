# Node.js 환경 설정
FROM node:16-alpine as build-stage

# 작업 디렉토리 설정
WORKDIR /app

# package.json 및 package-lock.json 복사
COPY package*.json ./

# 필요한 패키지 설치
RUN npm install

# 프로젝트 파일 복사
COPY . .

# Vite를 사용하여 프로젝트 빌드
RUN npm run build

# 빌드된 정적 파일을 서빙하기 위해 serve 패키지 설치
RUN npm install -g serve

# 서버 포트 설정
EXPOSE 8080

# serve를 사용하여 앱 실행, 포트 8080에서 리스닝
CMD ["serve", "-s", "dist", "-l", "8080"]


# # 빌드 환경
# FROM node:16-alpine as build-stage
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# # 프로덕션 환경
# FROM nginx:stable-alpine as production-stage
# COPY --from=build-stage /app/dist /usr/share/nginx/html

# # Nginx 설정 파일을 수정하는 단계 추가
# COPY nginx.conf /etc/nginx/nginx.conf

# EXPOSE 8080
# CMD ["nginx", "-g", "daemon off;"]
