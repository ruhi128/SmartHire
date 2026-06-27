# Judge0 CE — Self-Hosted Setup

## Quick Start (3 commands)

```bash
# 1. Navigate to this folder
cd SmartHire/judge0

# 2. Start Judge0 (downloads ~500MB images on first run)
docker-compose up -d

# 3. Wait ~30 seconds, then verify it's running:
curl http://localhost:2358/system_info
```

That's it. Judge0 is now running locally at `http://localhost:2358`.

---

## Add to backend/.env

```env
JUDGE0_URL=http://localhost:2358
```

Restart your backend:
```bash
# In your backend terminal — just type:
rs
```

---

## Verify it's working

Visit in browser: http://localhost:5000/api/code/status

You should see:
```json
{ "available": true, "message": "✅ Judge0 CE is running and ready" }
```

---

## Supported Languages (60+)

| Language   | ID  |
|------------|-----|
| Python 3   | 71  |
| JavaScript | 63  |
| Java       | 62  |
| C++        | 54  |
| C          | 50  |
| TypeScript | 74  |
| Go         | 60  |
| Rust       | 73  |

---

## Resource Usage

- RAM: ~500MB when idle, ~1GB under load
- CPU: minimal when idle
- Disk: ~2GB (Docker images)

---

## Stop / Start

```bash
docker-compose stop     # stop without removing
docker-compose start    # restart
docker-compose down     # stop and remove containers
docker-compose up -d    # start fresh
```

---

## Troubleshooting

**Port 2358 already in use:**
```bash
# Change port in docker-compose.yml:
ports:
  - "3358:2358"   # use 3358 instead
# Then update backend/.env:
JUDGE0_URL=http://localhost:3358
```

**Slow first startup:**  
Judge0 needs ~30-60 seconds to initialize PostgreSQL and Redis on first run.  
Run `docker-compose logs -f server` to watch startup progress.

**WSL2 on Windows:**  
Works perfectly. Run all commands in WSL2 terminal.  
Make sure Docker Desktop has WSL2 integration enabled.
