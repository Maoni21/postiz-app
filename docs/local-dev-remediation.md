# Postiz Local Remediation Plan (macOS + Docker + Next.js)

This guide addresses the two issues observed on macOS when running the Postiz stack locally:

1. **Port 5000 conflict** with the built-in AirPlay receiver, preventing requests from reaching the containerised Nginx entrypoint.
2. **CORS preflight failures** when the Next.js development server (port 4200) calls the API entrypoint over a different origin.

The steps below deliver a working setup that keeps the single exposed entrypoint recommended by the Postiz documentation while restoring API connectivity for the frontend.

---

## 1. Prerequisites

* Docker Desktop for macOS.
* Ports `5050`, `5432`, `6379`, `8081`, and `5540` available on the host.
* The Postiz repository cloned locally.

Optional (Plan B): administrator access to disable the macOS *AirPlay Receiver* feature via **System Settings → General → AirDrop & Handoff → AirPlay Receiver**.

---

## 2. Launch the infrastructure containers

The bundled `docker-compose.dev.yaml` file already provisions PostgreSQL, Redis, pgAdmin, and RedisInsight. Start them once and keep them running in the background:

```bash
pnpm install  # if dependencies are not yet installed

# Start databases and supporting services
docker compose -p postiz -f docker-compose.dev.yaml up -d
```

Verify the containers are healthy:

```bash
docker ps --filter "name=postiz"
```

---

## 3. Build and run the Postiz application container (Plan A – recommended)

Avoid the macOS port 5000 conflict by mapping the container port `5000` (internal Nginx) to host port `5050` instead. The internal topology remains unchanged.

```bash
# Build the local development image
docker build -f Dockerfile.dev -t postiz-app:2.6.4 .

# Restart the application container with the new port mapping
docker rm -f postiz-app 2>/dev/null || true

docker run --name postiz-app \
  --env-file .env \
  --network postiz_postiz-network \
  -v postiz-uploads:/uploads \
  -p 5050:5000 \
  -d postiz-app:2.6.4
```

If you prefer to keep using host port `5000` (Plan B), disable *AirPlay Receiver* on macOS before running the container with `-p 5000:5000`.

---

## 4. Frontend development server configuration

1. Copy the provided `apps/frontend/.env.local.example` file to `.env.local` on your workstation.
2. Start the Next.js dev server:

```bash
cd apps/frontend
pnpm dev
```

The server rewrites every `/api/*` request to `http://localhost:5050/api/*`, preventing CORS issues. Continue to call the API from the browser using relative paths (e.g. `fetch('/api/auth/register', …)`).

---

## 5. Environment variables

Copy `.env.example` to `.env` and keep only the variables shown below. They match the credentials defined inside `docker-compose.dev.yaml`:

```bash
DATABASE_URL=postgresql://postiz-local:postiz-local-pwd@postiz-postgres:5432/postiz-db-local
REDIS_URL=redis://postiz-redis:6379
JWT_SECRET=change-me-in-local-dev
FRONTEND_URL=http://localhost:4200
NEXT_PUBLIC_BACKEND_URL=http://localhost:5050/api
BACKEND_INTERNAL_URL=http://localhost:3000
NOT_SECURED=true
IS_GENERAL=true
STORAGE_PROVIDER=local
UPLOAD_DIRECTORY=/uploads
NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY=/uploads
```

The frontend-specific variables live in `apps/frontend/.env.local` (copy from `.env.local.example`):

```bash
API_TARGET=http://localhost:5050
NEXT_PUBLIC_BACKEND_URL=/api
NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY=/uploads
```

Remember to restart the application container and the Next.js dev server whenever these files change.

---

## 6. Validation checklist

1. **Confirm host port availability**
   ```bash
   sudo lsof -nP -iTCP:5000 -sTCP:LISTEN  # should return no AirPlay process when using Plan B
   ```
2. **Health check via the Nginx entrypoint**
   ```bash
   curl -i http://localhost:5050/api/health
   ```
3. **CORS preflight (if hitting the API cross-origin)**
   ```bash
   curl -i -X OPTIONS 'http://localhost:5050/api/auth/register' \
     -H 'Origin: http://localhost:4200' \
     -H 'Access-Control-Request-Method: POST' \
     -H 'Access-Control-Request-Headers: content-type'
   ```
   Expect a `204` response and the `Access-Control-Allow-Origin` header.
4. **Browser network panel**
   Verify that API calls from `http://localhost:4200` target `/api/...` (Next.js rewrites them to `http://localhost:5050`).

---

## 7. Optional: Nginx-side CORS handling

If you decide not to proxy through Next.js and keep genuine cross-origin calls, extend the Nginx configuration inside the container with the following snippet:

```nginx
location /api/ {
  if ($request_method = OPTIONS) {
    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Allow-Headers "Authorization,Content-Type,Accept,Origin,X-Requested-With" always;
    add_header Access-Control-Allow-Methods "GET,POST,PUT,PATCH,DELETE,OPTIONS" always;
    return 204;
  }

  add_header Access-Control-Allow-Origin $http_origin always;
  add_header Access-Control-Allow-Credentials "true" always;

  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_pass http://localhost:3000/;
}
```

Reload Nginx after editing: `nginx -s reload` (inside the container).

---

## 8. Troubleshooting tips

* Keep using host port `5050` in development to avoid recurring conflicts with macOS services.
* If the frontend still tries to reach `http://localhost:3000`, clear the Next.js cache and restart (`rm -rf .next && pnpm dev`).
* Inspect container logs with `docker logs -f postiz-app` when the API appears unreachable.

With these steps in place, the Postiz frontend and backend communicate locally without CORS errors while respecting the single-entrypoint architecture recommended by the upstream documentation.
