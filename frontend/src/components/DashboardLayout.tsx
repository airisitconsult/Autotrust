import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/logo.webp";
import { useAuth } from "../context/AuthContext";
import { canInspect, hasPermission, isSuperAdmin, roleLabel } from "../lib/access";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  show: boolean;
}

function IconHome() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
    </svg>
  );
}
function IconCar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13m-18 0v5a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-5m-18 0h18M7 16.5h.01M17 16.5h.01" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7l2 2 4-4" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM5 11a2 2 0 114 0 2 2 0 01-4 0z" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.6-4A12 12 0 0112 3a12 12 0 01-8.6 3A12 12 0 003 12c0 5.6 3.8 10.3 9 11.6 5.2-1.3 9-6 9-11.6 0-2-.4-3.9-1.4-5.5z" />
    </svg>
  );
}
function IconStorefront() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9.5L4.5 4h15L21 9.5M3 9.5a2.5 2.5 0 005 0M3 9.5V19a1 1 0 001 1h5m9-10.5a2.5 2.5 0 01-5 0m5 0a2.5 2.5 0 01-5 0m0 0a2.5 2.5 0 01-5 0m0 0a2.5 2.5 0 01-5 0m14 .5V19a1 1 0 01-1 1h-5m-4 0v-6a1 1 0 011-1h2a1 1 0 011 1v6m-4 0h4" />
    </svg>
  );
}

export function DashboardLayout({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  const items: NavItem[] = [
    { to: "/dashboard", label: "Overview", icon: <IconHome />, show: true },
    { to: "/my-listings", label: "My Listings", icon: <IconCar />, show: true },
    {
      to: "/inspector",
      label: "Inspection Queue",
      icon: <IconClipboard />,
      show: canInspect(user),
    },
    {
      to: "/admin/users",
      label: "Users",
      icon: <IconUsers />,
      show: hasPermission(user, "manage_users"),
    },
    { to: "/admin/team", label: "Team", icon: <IconShield />, show: isSuperAdmin(user) },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-slate-800 px-5">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="AutoTrust" className="h-8 w-auto brightness-0 invert" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items
          .filter((i) => i.show)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

        <div className="my-3 border-t border-slate-800" />

        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <IconStorefront />
          Back to Marketplace
        </Link>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {user?.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs text-slate-400">{user && roleLabel(user.role)}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-900 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">{sidebarContent}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
