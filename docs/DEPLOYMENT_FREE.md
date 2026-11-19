# 100% Free Production Deployment Guide ($0.00 / month)

This guide walks you through deploying the **Smart Internal Knowledge Assistant** completely on free-tier infrastructure.

---

## Strategy A: Managed Cloud PaaS Free Stack (Recommended)

Zero server maintenance, automated GitHub deployments, and managed high availability.

### 1. Database: Neon Serverless Postgres with pgvector (Free)
1. Sign up at [neon.tech](https://neon.tech) (Free tier includes 0.5 GB storage, autoscaling compute, and pre-installed `pgvector`).
2. Create a project named `smart-knowledge-db`.
3. In the Neon Console SQL Editor, verify `pgvector` extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copy the connection string (pooled or direct):
   ```text
   DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require"
   ```
5. Apply database schema and vector indexes from your terminal:
   ```bash
   DATABASE_URL="<your-neon-url>" npm run db:push --workspace=@knowledge/database
   DATABASE_URL="<your-neon-url>" npm run db:indexes --workspace=@knowledge/database
   ```

---

### 2. Cache: Upstash Serverless Redis (Free)
1. Sign up at [upstash.com](https://upstash.com) (Free tier includes 10,000 commands/day, 256MB storage, TLS).
2. Create a Redis database named `knowledge-cache` in the same region as Neon (e.g. AWS us-east-1).
3. Copy the `rediss://...` connection URL from the Upstash dashboard:
   ```text
   REDIS_URL="rediss://default:[password]@[endpoint].upstash.io:6379"
   ```

---

### 3. Backend API: Render.com Free Web Service
1. Sign up at [render.com](https://render.com) (Free tier includes 750 hours/month).
2. Click **New +** -> **Blueprint**, and connect your GitHub repository (it will automatically detect [`render.yaml`](../render.yaml)).
3. Or create a **New Web Service**:
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run db:generate --workspace=@knowledge/database && npm run build --workspace=@knowledge/api`
   - **Start Command:** `node apps/api/dist/main.js`
   - **Health Check Path:** `/health`
4. Set the Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your Neon connection string
   - `REDIS_URL`: Your Upstash Redis connection string
   - `GEMINI_API_KEY`: Your Google AI Studio API key
   - `ALLOWED_ORIGINS`: `https://your-app.vercel.app` (your Vercel frontend domain)
   - `CLERK_SECRET_KEY`: Your Clerk secret key
5. Once deployed, note your backend URL: e.g. `https://smart-knowledge-api.onrender.com`.

---

### 4. Frontend: Vercel Free Hobby Tier
1. Sign up at [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Select your GitHub repository.
3. Configure project settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Edit and select `apps/web`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://smart-knowledge-api.onrender.com`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_test_...`
5. Click **Deploy**. Vercel will build and assign an SSL domain (e.g. `https://smart-knowledge-assistant.vercel.app`).
6. Update your Render `ALLOWED_ORIGINS` with this Vercel domain!

---

## Strategy B: Self-Hosted Docker on Always-Free VPS

For users running on an **Oracle Cloud Always Free VM** (4 OCPU ARM, 24GB RAM - 100% free forever) or an Ubuntu/Debian server.

### 1. Server Setup & UFW Firewall
Run the automated deployment script on your fresh server:
```bash
chmod +x scripts/deploy-vps.sh
sudo ./scripts/deploy-vps.sh yourdomain.com
```

### 2. Configure Environment (`.env.production`)
Create `.env.production` on the server:
```bash
cp .env.example .env.production
chmod 600 .env.production
# Fill in GEMINI_API_KEY, CLERK keys, etc.
```

### 3. Launch Hardened Stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The stack runs:
- Next.js Web on `127.0.0.1:3000` (unexposed publicly)
- NestJS API on `127.0.0.1:4000` (unexposed publicly)
- PostgreSQL pgvector & Redis strictly on the internal bridge network (no UFW bypass)
- Nginx listening on `80` and `443` with Let's Encrypt SSL, rate limiting, and blocking `.git`/`.env`
