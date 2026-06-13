import { BarChart3, Link2, LogOut, Plus } from "lucide-react";
import { Navigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();

  if (loading)
    return <div className="page-loader">Loading your workspace...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Brand />
        <nav>
          <a className="active" href="#overview">
            <BarChart3 size={19} /> Overview
          </a>
          <a href="#links">
            <Link2 size={19} /> Links
          </a>
        </nav>
        <button className="sidebar-logout" onClick={logout} type="button">
          <LogOut size={18} /> Log out
        </button>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="section-kicker">Overview</p>
            <h1>Good to see you, {user.name.split(" ")[0]}.</h1>
          </div>
          <button className="button button-primary" type="button">
            <Plus size={18} /> Create link
          </button>
        </header>
        <section className="empty-dashboard">
          <div className="feature-icon">
            <Link2 size={24} />
          </div>
          <h2>Your links will live here</h2>
          <p>
            Create your first short link to begin collecting useful insights.
          </p>
          <button className="button button-accent" type="button">
            Create your first link
          </button>
        </section>
      </main>
    </div>
  );
}
