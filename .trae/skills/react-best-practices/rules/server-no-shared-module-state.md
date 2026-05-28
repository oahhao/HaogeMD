---
title: Avoid Shared Module State for Request Data
impact: HIGH
impactDescription: prevents concurrency bugs and request data leaks
tags: server, rsc, ssr, concurrency, security, state
---

## Avoid Shared Module State for Request Data

For React Server Components and client components rendered during SSR, avoid using mutable module-level variables to share request-scoped data. Server renders can run concurrently in the same process. If one render writes to shared module state and another render reads it, you can get race conditions, cross-request contamination, and security bugs where one user's data appears in another user's response.

Treat module scope on the server as process-wide shared memory, not request-local state.

**Incorrect (request data leaks across concurrent renders):**

```tsx
let currentUser: User | null = null

async function loadCurrentUser() {
  currentUser = await auth()
  return currentUser
}

export default async function Page() {
  await loadCurrentUser()
  return <Dashboard />
}

async function Dashboard() {
  return <div>{currentUser?.name}</div>
}
```

If two requests overlap, request A can set `currentUser`, then request B overwrites it before request A finishes rendering `Dashboard`.

**Correct (pass request data explicitly or use per-request caching):**

```tsx
import { cache } from 'react'

const getCurrentUser = cache(async () => {
  return await auth()
})

export default async function Page() {
  const user = await getCurrentUser()
  return <Dashboard user={user} />
}

function Dashboard({ user }: { user: User | null }) {
  return <div>{user?.name}</div>
}
```

**Incorrect (SSR client component reads shared module state):**

```tsx
let currentTheme = 'light'

export default async function Page() {
  currentTheme = (await getThemeFromCookies()) ?? 'light'
  return <ThemeShell />
}

'use client'
function ThemeShell() {
  return <div data-theme={currentTheme}>...</div>
}
```

Even though `ThemeShell` is a client component, its initial render during SSR can still observe shared server module state.

**Correct (serialize request-specific values through props):**

```tsx
export default async function Page() {
  const theme = (await getThemeFromCookies()) ?? 'light'
  return <ThemeShell theme={theme} />
}

'use client'
function ThemeShell({ theme }: { theme: string }) {
  return <div data-theme={theme}>...</div>
}
```

Safe exceptions:

- Immutable static assets or config loaded once at module scope
- Shared caches intentionally designed for cross-request reuse and keyed correctly
- Process-wide singletons that do not store request- or user-specific mutable data

For static assets and config, see [Hoist Static I/O to Module Level](./server-hoist-static-io.md). For request-local deduplication, see [Per-Request Deduplication with React.cache()](./server-cache-react.md).
