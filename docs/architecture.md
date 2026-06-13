# Architecture

Linkora uses a React single-page application and an Express REST API. In
production, Express serves the compiled client to keep browser and API requests
on one origin.

```mermaid
flowchart TB
  subgraph Browser
    UI[React UI]
  end
  subgraph Render
    API[Express REST API]
    Redirect[Redirect handler]
    Static[Compiled React assets]
  end
  DB[(Neon PostgreSQL)]
  Site[Destination website]

  UI --> API
  Static --> UI
  UI --> Redirect
  API --> DB
  Redirect --> DB
  Redirect --> Site
```

The database stores users, links, and visits. Redirect requests resolve the
short code, enforce expiry, record privacy-aware analytics, and return an HTTP
302 response.
