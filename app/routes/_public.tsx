import { Outlet } from 'react-router';

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <Outlet />
    </div>
  );
}
