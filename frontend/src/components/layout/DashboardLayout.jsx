
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />

      <main className="min-w-0 p-5 md:ml-64 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
