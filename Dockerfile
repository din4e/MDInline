# syntax=docker/dockerfile:1

# ---- 构建阶段:编译 Next.js 静态导出 ----
FROM node:20-alpine AS builder
WORKDIR /app
# 先拷清单,利用层缓存(npm ci 只在依赖变化时重跑)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
# 再拷源码(.dockerignore 已排除 node_modules / .next / out / tmp 等)
COPY frontend/ ./
# 生产构建:scripts/build.mjs → next build --webpack → /app/out
RUN npm run build

# ---- 运行阶段:nginx 托管静态文件 ----
# 纯静态导出,无 Node 服务端运行时;最终镜像约 ~80MB(nginx 基础镜像 ~45MB + 静态产物 ~35MB)。
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK CMD wget -q --spider http://localhost/ || exit 1
