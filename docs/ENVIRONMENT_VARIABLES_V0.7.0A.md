# Environment Variables — v0.7.0a

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Existing Neon **pooled** connection; hostname contains `-pooler` |
| `MIGRATION_DATABASE_URL` | Yes | Matching Neon **direct** connection for pre-deploy migrations and backups |
| `DATABASE_PROVIDER` | Yes | `neon` |
| `DATABASE_SSL` | Yes | `true` |
| `REQUIRE_NEON_POOLER` | Yes | `true` |
| `ADMIN_EMAIL` | Yes | Owner login email |
| `ADMIN_PASSWORD` | Yes | Minimum 12 characters; secret |
| `JWT_SECRET` | Yes | Minimum 32 random characters; secret |
| `ALLOWED_ORIGINS` | Yes | Exact comma-separated Guide/Chat/Admin origins |
| `DEEPSEEK_API_KEY` | When AI enabled | DeepSeek secret |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account |
| `R2_ACCESS_KEY_ID` | Yes | R2 S3 credential |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 S3 secret |
| `R2_BUCKET_NAME` | Yes | `bdg-ai-guide-images` |

Use the pooled and direct URLs shown by Neon’s **Connect** dialog for the same project, branch, role, and database. Never commit either URL.
