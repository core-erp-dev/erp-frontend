# Frontend Implementation Plan - ERP Employee Module (Next.js)

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (light mode)
- Axios (HTTP client)
- Zustand (state management ringan untuk auth)

---

## 1. Project Structure

```

src/
│
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx (home placeholder)
│   │   └── error.tsx
│   │
│   └── globals.css
│
├── modules/                  # 🔥 modular feature-based
│   ├── dashboard/
│   │   ├── pages/
│   │   └── sidebar.ts
│   │
│   └── employee/ (future)
│
├── components/
│   ├── ui/                  # shadcn
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── main-layout.tsx
│
├── lib/
│   ├── axios.ts             # axios instance + interceptor
│   ├── auth.ts              # token utils
│   └── env.ts               # base URL config
│
├── store/
│   └── auth-store.ts        # Zustand auth state
│
├── types/
│   └── auth.ts
│
└── config/
└── sidebar.ts           # dynamic sidebar config

```

---

## 2. Authentication Flow

### Login Flow
1. User input username + password
2. Call `/api/v1/auth/login`
3. Save:
   - accessToken → memory (zustand)
   - refreshToken → localStorage
4. Redirect to `/`

---

### Request Flow (Axios Interceptor)

1. Inject access token to header:
```

Authorization: Bearer <accessToken>

```

2. If 401:
   - Call `/api/v1/auth/refresh`
   - Update accessToken
   - Retry original request

3. If refresh fails:
   - Logout → redirect `/login`

---

## 3. Token Storage Strategy

| Token         | Storage       |
|--------------|--------------|
| accessToken   | Zustand (memory only) |
| refreshToken  | localStorage |

---

## 4. Base URL Config

Use `.env`

```

NEXT_PUBLIC_API_BASE_URL=[http://localhost:8080](http://localhost:8080)

```

Access via:
```

process.env.NEXT_PUBLIC_API_BASE_URL

```

---

## 5. Sidebar System (Modular)

Each module exports:

```

export const sidebarItems = [
{
title: "Dashboard",
href: "/",
icon: "home"
}
];

```

Global sidebar loader:
- Scan modules/*
- Merge all sidebar configs

👉 Jadi:
**Tambah folder module = otomatis muncul di sidebar**

---

## 6. UI Pages

### Login Page
- Card centered
- Input username/password
- Button login
- Loading state

---

### Dashboard Layout
- Sidebar (left)
- Header (top)
- Content (main)

---

### Error Page
- Custom error page
- No default Next error

---

## 7. Styling

- Light mode only
- Clean minimal (shadcn default)
- No overdesign

---

## 8. Future Ready

- Module-based scaling
- Easy to plug new features
- Clean separation (auth / modules / shared)

---

## DONE CRITERIA

- Login works
- Token auto refresh works
- Sidebar render dynamic
- Layout ready
- Error page custom
