FROM node:20-alpine AS deps
WORKDIR /work

# Backend dependencies
COPY backend/package*.json backend/
RUN cd backend && npm install

# Frontend dependencies
COPY web/package*.json web/
RUN cd web && npm install --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /work
COPY --from=deps /work/backend/node_modules backend/node_modules
COPY --from=deps /work/web/node_modules web/node_modules
COPY backend/ backend/
COPY web/ web/

RUN cd web && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /work/backend ./backend
COPY --from=builder /work/web ./web

RUN npm install -g concurrently

EXPOSE 3000
EXPOSE 3001

CMD ["npx", "concurrently", "--kill-others", "--raw", "npm --prefix backend start", "npm --prefix web start"]

