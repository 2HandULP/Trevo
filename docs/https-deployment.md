# HTTPS Deployment

NFR-06 is implemented with Caddy as the deployment reverse proxy. Caddy
terminates TLS, obtains and renews Let's Encrypt certificates, redirects HTTP to
HTTPS automatically, and forwards traffic to the existing Docker services.

## Required DNS

Create an `A` or `CNAME` record for the deployment hostname before starting the
stack. The value must resolve to the server running Docker Compose.

## Environment Variables

Add these values to the deployment `.env` file:

```bash
PUBLIC_DOMAIN=trevo.example.com
ACME_EMAIL=admin@example.com
HTTP_PORT=80
HTTPS_PORT=443
```

`PUBLIC_DOMAIN` must be only the hostname, without `https://`.

## Start With HTTPS

```bash
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

Caddy stores certificates in the `caddy_data` Docker volume so renewals survive
container restarts.

The HTTPS compose override removes the direct frontend and backend published
ports from the base development compose file. In deployment, only Caddy should
publish ports 80 and 443.

## Routing

| Request path | Upstream |
|--------------|----------|
| `/api/*` | `backend:8080` |
| all other paths | `frontend:5173` |

The frontend is configured to call the API through same-origin `/api` in the
HTTPS compose override. This avoids mixed-content requests and keeps tokens off
plain HTTP in deployed environments.

## Local Development

The default `docker-compose.yml` remains HTTP-only for local development. Use
the HTTPS override only in an environment where ports 80 and 443 are reachable
and DNS already points to the host.
