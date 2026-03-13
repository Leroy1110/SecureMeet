import { Outlet } from "react-router-dom";

function PageShell() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Outlet />
    </div>
  );
}

export default PageShell