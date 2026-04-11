# Implementation Plan: Organization Hierarchy Module

## Phase 1: Foundation & Types
- [ ] Create `modules/organization/types.ts` based on API documentation.
- [ ] Create `modules/organization/services/organization-api.ts` using the existing Axios instance in `lib/axios.ts`.
- [ ] Define interfaces for `Position`, `PositionTree`, and `PositionRequest`.

## Phase 2: UI Components (Shadcn Based)
- [ ] Create `modules/organization/components/position-tree-node.tsx`: A recursive component to render the hierarchy using Shadcn `Card` and `Button`.
- [ ] Create `modules/organization/components/position-form-modal.tsx`: A reusable modal for Create and Edit positions using Shadcn `Dialog`, `Form`, `Input`, and `Select`.
- [ ] Add loading states using Shadcn `Skeleton`.

## Phase 3: Page Implementation
- [ ] Create `modules/organization/pages/hierarchy-page.tsx`.
- [ ] Implement data fetching using `useEffect` or a custom hook.
- [ ] Implement Delete logic with "Orphan Check" and "Assignment Check" error handling (toast notification).
- [ ] Implement Circular Reference validation handling for the Edit form.

## Phase 4: Integration
- [ ] Connect the page to `app/(dashboard)/organization/hierarchy/page.tsx`.
- [ ] Update `config/sidebar.ts` to include the "Organization Hierarchy" menu.
- [ ] Ensure the coding style matches the existing modular structure (Lucide icons, Tailwind, Shadcn).

## Success Criteria
- [ ] Successfully fetch and render the Tree JSON from `/api/positions/tree`.
- [ ] Create a new sub-ordinate position.
- [ ] Edit a position and receive a 400 error if a circular reference is attempted.
- [ ] Soft delete a position (only if criteria are met).