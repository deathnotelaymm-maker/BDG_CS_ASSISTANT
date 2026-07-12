# PostgreSQL Schema — v0.4.0

The app uses SQLAlchemy and creates tables automatically on first start.

New AI Mode tables:

- `ai_prompt_sections`
- `ai_model_settings`
- `chat_sessions`
- `chat_memory_messages`

Existing tables still used:

- `admin_users`
- `categories`
- `guides`
- `faqs`
- `knowledge_items`
- `theme_settings`
- `chat_logs`

PostgreSQL stores prompt sections, FAQ, smart guide metadata, chat logs, and memory summaries. Image files should not be stored inside PostgreSQL; use Cloudflare R2 or object storage and save the URL.
