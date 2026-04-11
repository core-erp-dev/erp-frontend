# UI Refinement Implementation Plan (ShadCN Monochrome)

## Objective

Refactor the entire frontend UI to follow a consistent **ShadCN-inspired monochrome design system**.

Focus ONLY on:

* Visual design
* Styling
* Component consistency

DO NOT modify:

* Business logic
* API calls
* State management
* Routing behavior

---

## Scope

Apply refinement to ALL existing pages:

* Dashboard
* Login page
* Employee module
* Any other existing pages (AI must explore project structure)

---

## Global Design System

### 1. Color System (Monochrome Only)

* NO blue or primary colors
* Use grayscale only

| Purpose         | Class           |
| --------------- | --------------- |
| Page background | bg-gray-50      |
| Card background | bg-white        |
| Border          | border-gray-200 |
| Primary text    | text-gray-900   |
| Secondary text  | text-gray-500   |
| Hover           | bg-gray-100     |

---

### 2. Layout & Spacing

* Use consistent spacing scale
* Card padding: `p-6`
* Section gap: `gap-6` or `gap-8`
* Avoid cramped layouts

---

### 3. Border & Radius

* Border: `border border-gray-200`
* Radius: `rounded-xl` or `rounded-2xl`
* NEVER use hard/black borders

---

### 4. Shadows & Depth

* Use subtle shadows only:

  * `shadow-sm`
  * `shadow-md`
* Create layering:

  * Page: gray-50
  * Cards: white

---

### 5. Typography

* Title: `text-xl font-semibold`
* Section title: `text-lg font-semibold`
* Body: `text-sm`
* Secondary text: `text-gray-500`

---

## Component Guidelines

### 1. Sidebar

* Background: `bg-white`
* Border right: `border-r border-gray-200`
* Menu item:

  * Default: transparent
  * Hover: `bg-gray-100`
  * Active: `bg-gray-100 font-medium`
* Use `lucide-react` icons

---

### 2. Profile Section (Sidebar Bottom)

* Must be placed at bottom of sidebar
* Contains:

  * Avatar
  * Name
  * Email
* Clickable → opens dropdown menu

Dropdown items:

* Account
* Settings
* Logout

Style:

* `rounded-xl`
* `hover:bg-gray-100`
* Use popover/dropdown pattern (ShadCN style)

---

### 3. Cards (Dashboard & Others)

* `bg-white`
* `rounded-2xl`
* `border border-gray-200`
* `shadow-sm`
* Hover: subtle shadow increase

Content:

* Title: small muted text
* Value: large bold text (`text-2xl font-bold`)

---

### 4. Buttons

* Default: monochrome
* Primary feel without color:

  * `bg-gray-900 text-white`
* Secondary:

  * `bg-white border border-gray-200`

---

### 5. Inputs (Login Page etc.)

* `border border-gray-200`
* `rounded-xl`
* Focus:

  * `focus:ring-1 focus:ring-gray-300`
* Remove strong outlines

---

## Refactoring Tasks

### Phase 1 — Audit

* Scan entire project
* List all pages/components
* Identify inconsistent styles

### Phase 2 — Global Styling

* Normalize background colors
* Normalize typography
* Replace all hard borders

### Phase 3 — Layout Refinement

* Improve spacing
* Apply consistent grid system
* Add proper padding/margins

### Phase 4 — Component Refactor

* Sidebar
* Cards
* Buttons
* Forms (login page)

### Phase 5 — Polish

* Add hover states
* Add subtle transitions
* Ensure consistency across pages

---

## Constraints

* DO NOT introduce new color themes
* DO NOT change logic
* DO NOT overengineer
* Keep implementation clean and simple

---

## Expected Output

* Updated React + Tailwind components
* Consistent UI across all pages
* Clean, modern, ShadCN-like interface

---

## Notes

* This is a UI-only refinement task
* Backend and logic are already correct
* Focus on visual quality and consistency
