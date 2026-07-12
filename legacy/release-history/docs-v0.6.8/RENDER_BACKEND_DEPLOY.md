# Render Backend Deploy Guide

## Render service settings

Create a new Web Service and point it to `backend/`.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Environment variables

```text
APP_NAME=Your Project Name
ENVIRONMENT=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
SECRET_KEY=replace-with-long-random-secret
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=replace-with-strong-password
ALLOWED_ORIGINS=https://guide.yourdomain.com,https://chat.yourdomain.com,https://admin.yourdomain.com
SUPPORT_LINK=https://t.me/your_support_bot
```

## Health check

```text
https://api.yourdomain.com/health
```

Expected:

```json
{"ok": true, "service": "Your Project Name", "version": "0.1.0"}
```
