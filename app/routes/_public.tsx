// Public site layout — SP7 Phase D1.
//
// Stays a thin pass-through. The shared <PublicNav> + <PublicFooter> are
// rendered per-route (landing, login, /auth/*, 404) rather than in the layout
// because every public surface uses a different `links` set:
//   - landing:   About · Intern Assessments · Admin Sign In (CTA)
//   - login:     Back to home · Intern Assessments
//   - 404:       Home · Admin Sign In (CTA)
//   - intern/*:  (D2 — back-link variant, no nav CTAs)
//
// The intern subtree (_public.intern.tsx) still renders its own ad-hoc nav;
// D2 rebuilds it to use <PublicNav variant="intern">. Keeping nav out of
// the layout avoids a double-nav on the intern routes during the D1→D2 gap.

import { Outlet } from 'react-router';

export default function PublicLayout() {
  return <Outlet />;
}
