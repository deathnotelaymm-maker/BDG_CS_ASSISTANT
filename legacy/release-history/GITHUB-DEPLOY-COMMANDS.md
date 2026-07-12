# GitHub + Deploy Commands for v0.3.0

## 1. Push to GitHub

Open PowerShell inside the extracted project folder:

```powershell
cd $env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.3.0
git init
git add .
git commit -m "v0.3.0 BDG Mobile Help Smart Guide AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## 2. Render backend

Create a Render Web Service:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Environment variables:

```text
APP_NAME=BDG Help Center
ENVIRONMENT=production
DATABASE_URL=<Render PostgreSQL external/internal database URL>
SECRET_KEY=<strong random value>
ADMIN_EMAIL=<your admin email>
ADMIN_PASSWORD=<your strong password>
ALLOWED_ORIGINS=https://guide.yourdomain.com,https://chat.yourdomain.com,https://admin.yourdomain.com
SUPPORT_LINK=https://t.me/your_support_bot
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=8
```

## 3. Cloudflare Pages frontends

Create three Cloudflare Pages projects from the same repository:

### Guide site

```text
Root directory: guide-site
Build command: leave empty
Build output directory: /
Custom domain: guide.yourdomain.com
```

### Chat site

```text
Root directory: chat-site
Build command: leave empty
Build output directory: /
Custom domain: chat.yourdomain.com
```

### Admin site

```text
Root directory: admin-site
Build command: leave empty
Build output directory: /
Custom domain: admin.yourdomain.com
```

## 4. Update frontend config.js before deploy

In each frontend folder, change:

```js
API_BASE: 'https://api.yourdomain.com'
GUIDE_URL: 'https://guide.yourdomain.com'
CHAT_URL: 'https://chat.yourdomain.com'
ADMIN_URL: 'https://admin.yourdomain.com'
```

Then commit and push again.
