# Deploying TaskSheet to Google Cloud (Always Free e2-micro)

This guide covers the full lifecycle of running this app on a GCP Compute Engine VM: first-time
setup, deploying, checking the database, reading logs, troubleshooting, updating, backing up, and
ongoing maintenance.

**Assumed VM config** (see chat history / CLAUDE.md for why): `e2-micro`, region `us-west1`,
Debian 12, 30GB standard persistent disk, HTTP/HTTPS firewall allowed. 1GB RAM is tight for
Postgres + Spring Boot + nginx together, so this guide includes a swap file step — don't skip it.

---

## 0. One-time facts to note down

- **VM external IP**: Compute Engine → VM instances → copy the "External IP" column.
  Referred to below as `<VM_IP>`.
- **Zone**: e.g. `us-west1-b` — needed for `gcloud` SSH commands.

---

## 1. Access the VM (SSH)

**Easiest — no local install needed:**
Compute Engine → VM instances → click the **SSH** button next to `ks-tasks`. Opens a
browser-based terminal.

**Alternative — `gcloud` CLI** (if you have the [Google Cloud SDK](https://cloud.google.com/sdk)
installed locally):

```bash
gcloud compute ssh ks-tasks --zone=us-west1-b
```

First run will prompt to generate an SSH key pair automatically — accept the defaults.

---

## 2. First-time server setup

Run once, right after the VM is created.

### 2.1 Update packages

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### 2.2 Add swap (important on 1GB RAM e2-micro)

Without this, Postgres + the JVM + nginx together can trigger OOM kills under load.

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # confirm swap shows up
```

### 2.3 Install Docker + Compose plugin

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # or log out/in — applies the group change to this shell
docker --version
docker compose version
```

### 2.4 Install git

```bash
sudo apt-get install -y git
```

---

## 3. Deploy the app

### 3.1 Clone the repo

```bash
git clone <YOUR_REPO_URL> ks_tasks
cd ks_tasks
```

(If the repo is private, set up a deploy key or use `gh auth login` / a personal access token.)

### 3.2 Configure `.env` for production

```bash
cp .env.example .env
nano .env
```

Change these from the defaults — **do not run production with the example values**:

| Variable | Set to |
|---|---|
| `DB_PASSWORD` | a real password, not `kstasks` |
| `JWT_SECRET` | output of `openssl rand -base64 48` |
| `CORS_ALLOWED_ORIGINS` | `http://<VM_IP>` (or your domain once you have one, see §8) |
| `JWT_COOKIE_SECURE` | `false` for now (plain HTTP); `true` once HTTPS is set up |
| `SPRING_PROFILES_ACTIVE` | `seed` for first boot if you want demo data, otherwise `""` |

Generate the JWT secret:

```bash
openssl rand -base64 48
```

### 3.3 Harden `docker-compose.yml` for internet exposure (recommended)

By default `db` (5432) and `backend` (8080) publish ports on the VM's network interface. GCP's
firewall blocks external access to them by default (only 22/80/443 are open) — but as
defense-in-depth, remove those public mappings since nginx already proxies `/api/` internally to
`backend`. Edit `docker-compose.yml`:

```yaml
  db:
    # ports:
    #   - '${DB_PORT:-5432}:5432'
```

```yaml
  backend:
    # ports:
    #   - '${BACKEND_PORT:-8080}:8080'
```

Comment out (or delete) both `ports:` blocks. Only `frontend`'s `80:5180` mapping should remain
public.

### 3.4 Start the stack

```bash
docker compose up -d --build
```

First build will take a while on e2-micro (Maven + npm build inside the containers, on 1 shared
vCPU). Grab a coffee.

### 3.5 Verify

```bash
docker compose ps          # all 3 services should show "Up" / "healthy"
curl -I http://localhost   # from inside the VM, expect HTTP 200
```

From your own machine, open `http://<VM_IP>` in a browser. Login with the seeded demo users if
`SPRING_PROFILES_ACTIVE=seed` (see README.md for the demo credentials table).

---

## 4. Check the database

### 4.1 Open a psql shell inside the running container

```bash
docker compose exec db psql -U kstasks -d kstasks
```

(Use your actual `DB_USER`/`DB_NAME` from `.env` if you changed them.)

Useful queries once inside:

```sql
\dt                          -- list tables
SELECT * FROM users;
SELECT * FROM tasks LIMIT 20;
\d tasks                     -- describe a table's columns
SELECT * FROM flyway_schema_history ORDER BY installed_rank; -- migration history
\q                            -- quit
```

### 4.2 One-off query without an interactive shell

```bash
docker compose exec db psql -U kstasks -d kstasks -c "SELECT count(*) FROM tasks;"
```

### 4.3 Check disk usage of the DB volume

```bash
docker system df -v | grep ks_tasks_db_data
```

---

## 5. Check logs

```bash
docker compose logs -f              # all services, follow
docker compose logs -f backend      # just the API
docker compose logs -f frontend     # nginx access/error logs
docker compose logs -f db           # Postgres logs
docker compose logs --since 1h backend    # last hour only
docker compose logs --tail 200 backend    # last 200 lines
```

Backend startup issues (migration failures, bad `JWT_SECRET`, DB connection refused) will show up
in `docker compose logs backend` right after `docker compose up -d`.

---

## 6. Troubleshooting common issues

| Symptom | Likely cause | Check |
|---|---|---|
| `docker compose up` hangs / backend keeps restarting | OOM kill on 1GB RAM | `docker compose logs backend` for `Killed`; `free -h`; confirm swap is on (§2.2) |
| Backend won't start, Flyway error | Bad/conflicting migration | `docker compose logs backend \| grep -i flyway` |
| Frontend loads but login/API calls fail (CORS error in browser console) | `CORS_ALLOWED_ORIGINS` doesn't match the URL you're browsing from | Fix `.env`, `docker compose up -d backend` to restart just that service |
| Can't reach `http://<VM_IP>` at all | GCP firewall not allowing HTTP, or frontend container not up | Compute Engine → VM instances → confirm HTTP firewall tag; `docker compose ps` |
| 502/504 from nginx | Backend container crashed or still starting | `docker compose logs backend`; `docker compose ps` |
| Disk filling up | Old Docker images/build cache | `docker system df`; `docker system prune -af` (careful: removes unused images, safe to run) |
| Out of memory generally | e2-micro is genuinely tight | Confirm swap is active; consider trimming `SPRING_PROFILES_ACTIVE` seed data, or as a last resort resize the VM (loses Always Free — see chat notes) |

Check overall VM resource usage:

```bash
free -h        # memory + swap
df -h           # disk space
docker stats    # live per-container CPU/memory
top             # overall process view
```

---

## 7. Updating the app after code changes

```bash
cd ~/ks_tasks
git pull
docker compose up -d --build
```

This rebuilds only what changed and restarts affected containers. Flyway applies any new
migrations automatically on backend startup — check `docker compose logs backend` afterward to
confirm they applied cleanly.

To restart a single service without rebuilding (e.g. after an `.env` change):

```bash
docker compose up -d backend
```

---

## 8. Backup & restore

Data lives in two Docker named volumes: `ks_tasks_db_data` (Postgres) and
`ks_tasks_documents_data` (uploaded epic documents). Back these up before any risky operation
(VM deletion, disk resize, major upgrade).

### 8.1 Database dump

```bash
docker compose exec db pg_dump -U kstasks kstasks > backup_$(date +%F).sql
```

Copy it off the VM to your local machine:

```bash
# run this on your LOCAL machine, not the VM
gcloud compute scp ks-tasks:~/ks_tasks/backup_2026-08-23.sql . --zone=us-west1-b
```

### 8.2 Restore from a dump

```bash
cat backup_2026-08-23.sql | docker compose exec -T db psql -U kstasks -d kstasks
```

### 8.3 Back up uploaded documents

```bash
docker run --rm -v ks_tasks_documents_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/documents_$(date +%F).tar.gz -C /data .
```

Restore the same way in reverse (`tar xzf` into the volume via a throwaway container).

---

## 9. Ongoing maintenance

- **OS updates**: `sudo apt-get update && sudo apt-get upgrade -y` every so often; reboot if a
  kernel update requires it (`sudo reboot` — containers with `restart: unless-stopped` come back
  up automatically).
- **Docker cleanup**: `docker system prune -af --volumes=false` periodically to reclaim disk from
  old build layers (never prune volumes — that's your data).
- **Watch disk usage**: `df -h` — 30GB is the free-tier cap; the biggest growth over time will be
  Postgres data and uploaded documents.
- **Free tier limits to stay under** (see chat history for details): `e2-micro` machine type,
  region `us-west1`/`us-central1`/`us-east1` only, ≤30GB standard persistent disk, and ~1GB/month
  network egress. Don't resize the machine type or move regions unless you're OK losing free-tier
  status.

---

## 10. Optional: domain + HTTPS

Currently the app is served over plain HTTP at `http://<VM_IP>`. To add a domain + TLS:

1. Point an A record for your domain at `<VM_IP>`.
2. Install Caddy or use certbot+nginx on the VM for automatic Let's Encrypt certs (Caddy is
   simplest — it auto-provisions and renews certs with a ~5-line Caddyfile reverse-proxying to
   the `frontend` container's port 80).
3. Update `.env`: `CORS_ALLOWED_ORIGINS=https://yourdomain.com` and `JWT_COOKIE_SECURE=true`.
4. `docker compose up -d backend` to apply.

Not required for Always Free eligibility — this is purely about serving over HTTPS instead of
plain HTTP.

---

## Quick reference

```bash
# SSH in
gcloud compute ssh ks-tasks --zone=us-west1-b

# Deploy / redeploy
cd ~/ks_tasks && git pull && docker compose up -d --build

# Status
docker compose ps

# Logs
docker compose logs -f backend

# DB shell
docker compose exec db psql -U kstasks -d kstasks

# Resource check
free -h && df -h && docker stats --no-stream

# Backup DB
docker compose exec db pg_dump -U kstasks kstasks > backup_$(date +%F).sql
```
