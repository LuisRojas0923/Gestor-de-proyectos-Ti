Frontend review: approved
Findings: none (no remaining blocking/high findings in focused re-review scope)
Required checks: Reported by requester: modal test passed, npm build passed, focal eslint warnings only.
Design-system risks: none blocking/high in the verified fixes.
Blocking reasons: none.

Scope reviewed:
- frontend/src/pages/DevelopmentDetail/WbsTab.tsx
- frontend/src/pages/DevelopmentDetail/DeleteActivityModal.tsx
- frontend/src/pages/DevelopmentDetail/WbsDetailModal.tsx
- frontend/src/pages/DevelopmentDetail/WbsNodeModal.tsx
- frontend/src/components/assignments/ValidationStatusBadge.tsx

Focused verification:
- Reordering is gated to the `Activas` filter only.
- Delete modal confirm/cancel controls reflect submitting state.
- Detail modal shows `Anulada` state and validation badge for annulled activities.
- Edit payload does not send `delegado_por_id`; create payload still may set it.
