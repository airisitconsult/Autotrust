import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.webp";
import { useAdvisorChat } from "../context/AdvisorChatContext";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../lib/access";

const linkBase =
  "px-3 py-2 rounded-lg text-sm font-medium transition-colors";
const linkActive = "bg-brand-50 text-brand-700";
const linkInactive = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

export function Navbar() {
  const { user, logout } = useAuth();
  const { setOpen: setChatOpen } = useAdvisorChat();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function openChat() {
    setOpen(false);
    // The full-page chat (/advisor) is already the chat; nothing to open.
    if (!pathname.startsWith("/advisor")) setChatOpen(true);
  }

  function handleLogout() {
    logout();
    setOpen(false);
    navigate("/");
  }

  const links = [
    { to: "/", label: "Browse", show: true },
    { to: "/dashboard", label: "Dashboard", show: !!user },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
          <img src={logo} alt="AutoTrust" className="h-10 w-auto sm:h-11" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links
            .filter((l) => l.show)
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkInactive}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          <button onClick={openChat} className={`${linkBase} ${linkInactive}`}>
            AI Assistant
          </button>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                to="/create-listing"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                + List a vehicle
              </Link>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="truncate max-w-[12rem]">{user.email}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {roleLabel(user.role)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {links
              .filter((l) => l.show)
              .map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            <button onClick={openChat} className={`${linkBase} ${linkInactive} text-left`}>
              AI Assistant
            </button>
            {user ? (
              <>
                <Link
                  to="/create-listing"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white"
                >
                  + List a vehicle
                </Link>
                <div className="mt-2 px-3 text-xs text-slate-500">
                  Signed in as {user.email} ({roleLabel(user.role)})
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-600"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
