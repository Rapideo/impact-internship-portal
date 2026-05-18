// Re-export — ToastProvider's canonical home is app/components/ToastProvider.tsx
// (existing call sites import from there). Re-exported here for forward
// compatibility with the plan's preferred toast/ namespace.
export { ToastProvider, useToast } from '../ToastProvider';
