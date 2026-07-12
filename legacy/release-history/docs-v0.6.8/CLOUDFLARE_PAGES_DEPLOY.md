# Cloudflare Pages Deploy Guide

You will create three Pages projects.

## Guide site

Project folder:

```text
guide-site
```

Build command:

```text
None
```

Output directory:

```text
/
```

Custom domain:

```text
guide.yourdomain.com
```

## Chat site

Project folder:

```text
chat-site
```

Custom domain:

```text
chat.yourdomain.com
```

## Admin site

Project folder:

```text
admin-site
```

Custom domain:

```text
admin.yourdomain.com
```

## Update config.js

In each folder, edit `config.js`:

```js
window.APP_CONFIG = {
  API_BASE: 'https://api.yourdomain.com',
  SITE_NAME: 'Your Project Name'
};
```
