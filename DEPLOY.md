# Deploy — property-platform (enrollnexus droplet pattern)

Mirrors your existing `/srv/<app>/app` + nginx-subdomain setup (same as the CRM
and Guide My Education apps), with the env differences this app needs.

> **What's different from your NextAuth apps:** this app uses **custom JWT auth
> (`AUTH_SECRET`, not `NEXTAUTH_SECRET`/`NEXTAUTH_URL`)**, has **no Resend**, and
> **needs Cloudinary**. Our code reads **`MONGODB_DB`**, so you don't `sed` the
> db name into the URI path — just set `MONGODB_DB`.

Example below uses app/user `landledger`, port `3002`, subdomain
`landledger.enrollnexus.com`. Swap to taste.

---

## 1. One-time server setup

```bash
# dedicated user + dir (same as your other apps)
adduser --system --group landledger
install -d -o landledger -g landledger /srv/landledger
sudo -u landledger git clone <repo-url> /srv/landledger/app
```

If you deploy without a git remote, `rsync` the project up instead (exclude
`node_modules` and `.next`).

## 2. Environment file

```bash
cd /srv/landledger/app
cp .env.production.example .env.production
# fill real values:
#   MONGODB_URI   -> same Atlas cluster, any db (db name comes from MONGODB_DB)
#   MONGODB_DB    -> property_platform  (or landledger)
#   AUTH_SECRET   -> openssl rand -base64 32
#   CLOUDINARY_*  -> from the Cloudinary console
nano .env.production
chown landledger:landledger .env.production && chmod 600 .env.production
```

`next start` auto-loads `.env.production` from the working dir — no systemd
`EnvironmentFile` needed.

## 3. Build

```bash
sudo -u landledger bash -lc 'cd /srv/landledger/app && npm ci && npm run build'
```

## 4. Run (systemd)

`/etc/systemd/system/landledger.service`:

```ini
[Unit]
Description=property-platform (landledger)
After=network.target

[Service]
Type=simple
User=landledger
WorkingDirectory=/srv/landledger/app
Environment=NODE_ENV=production
Environment=PORT=3002
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now landledger
systemctl status landledger          # should be active; serving on 127.0.0.1:3002
```

## 5. nginx + TLS

`/etc/nginx/sites-available/landledger.enrollnexus.com`:

```nginx
server {
    server_name landledger.enrollnexus.com;

    client_max_body_size 110m;   # Cloudinary uploads go direct to Cloudinary,
                                  # but keep headroom for form posts.

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/landledger.enrollnexus.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d landledger.enrollnexus.com     # adds the TLS server block
```

> `X-Forwarded-Proto $scheme` matters: it's how the app knows the request is
> HTTPS so the `secure` session cookie is honoured behind the proxy.

## 6. DNS

Add an **A record**: `landledger` → droplet IP (same as your other subdomains).

## 7. Seed (optional)

Creates demo accounts + listings. In production you usually want **only an
admin** — run it once, then change the admin password, or skip and create the
admin another way.

```bash
sudo -u landledger bash -lc 'cd /srv/landledger/app && npm run seed'
# prints the demo logins; CHANGE THEM before real use
```

## 8. Redeploy (updates)

```bash
sudo -u landledger bash -lc 'cd /srv/landledger/app && git pull && npm ci && npm run build'
systemctl restart landledger
```

## 9. Logs & rollback

```bash
journalctl -u landledger -f            # live logs
git -C /srv/landledger/app log --oneline -5
# rollback: checkout previous commit, npm ci && npm run build, restart
```

---

### Pre-flight checklist
- [ ] `.env.production` has `AUTH_SECRET`, `MONGODB_URI`, `MONGODB_DB`, all three `CLOUDINARY_*`, `NODE_ENV=production`
- [ ] `.env.production` is `chmod 600`, owned by the app user
- [ ] systemd service active, listening on the chosen port
- [ ] nginx proxy passes `X-Forwarded-Proto` and has `client_max_body_size`
- [ ] TLS cert issued; subdomain resolves
- [ ] Atlas Network Access allows the droplet IP
- [ ] Cloudinary keys are the production ones
