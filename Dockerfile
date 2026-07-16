# Single-process image: Next.js serves both the dashboard and the embedded
# MCP endpoint at /api/mcp. The web build imports compiled tool functions from
# the repo-root dist/, so the root `tsc` build MUST run before the web build.
FROM node:20-alpine

WORKDIR /app

# Root deps (includes @modelcontextprotocol/sdk, yahoo-finance2, zod).
COPY package*.json ./
RUN npm install

# Source, then compile src/ -> dist/.
COPY . .
RUN npm run build

# Web deps + Next.js production build (needs dist/ from the step above).
RUN npm --prefix web install
RUN npm --prefix web run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# `next start` honors $PORT; default 3000.
CMD ["npm", "--prefix", "web", "run", "start"]
