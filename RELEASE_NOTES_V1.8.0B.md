# v1.8.0b — Admin AI Q&A route fix

This hotfix fixes the Admin navigation link that was visible in the sidebar but opened the router's **Not Found** page.

The Admin Vite configuration now runs the TanStack file-route generator on every production build, and the generated route registry includes `/_admin/ai-qa`. The previously shipped Q&A approval repair is included as well.
