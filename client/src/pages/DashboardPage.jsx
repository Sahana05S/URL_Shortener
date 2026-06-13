import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Link2,
  LogOut,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [showCreate, setShowCreate] = useState(false);

  const loadLinks = useCallback(async () => {
    setLoadingLinks(true);
    setLoadError("");
    try {
      const query = new URLSearchParams({ search, sort });
      const data = await apiRequest(`/api/links?${query}`);
      setLinks(data.links);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoadingLinks(false);
    }
  }, [search, sort]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(loadLinks, 250);
    return () => clearTimeout(timer);
  }, [loadLinks, user]);

  if (loading)
    return <div className="page-loader">Loading your workspace...</div>;
  if (!user) return <Navigate to="/login" replace />;

  async function deleteLink(link) {
    const confirmed = window.confirm(
      `Delete ${link.shortCode}? This action cannot be undone.`,
    );
    if (!confirmed) return;
    await apiRequest(`/api/links/${link.id}`, { method: "DELETE" });
    setLinks((current) => current.filter((item) => item.id !== link.id));
  }

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
          <button
            className="button button-primary"
            onClick={() => setShowCreate(true)}
            type="button"
          >
            <Plus size={18} /> Create link
          </button>
        </header>

        <section className="summary-grid" aria-label="Link summary">
          <SummaryCard label="Total links" value={links.length} />
          <SummaryCard
            label="Total clicks"
            value={links.reduce((sum, link) => sum + link.clickCount, 0)}
          />
          <SummaryCard
            label="Best link"
            value={
              links.length
                ? links.reduce((best, link) =>
                    link.clickCount > best.clickCount ? link : best,
                  ).shortCode
                : "—"
            }
          />
        </section>

        <section className="links-panel" id="links">
          <div className="links-toolbar">
            <div>
              <h2>Your links</h2>
              <p>Manage every short link from one place.</p>
            </div>
            <div className="toolbar-controls">
              <label className="search-control">
                <Search size={18} />
                <span className="sr-only">Search links</span>
                <input
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search links"
                  value={search}
                />
              </label>
              <select
                aria-label="Sort links"
                onChange={(event) => setSort(event.target.value)}
                value={sort}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="clicks">Most clicked</option>
              </select>
            </div>
          </div>

          {loadingLinks ? (
            <LinkSkeleton />
          ) : loadError ? (
            <div className="panel-state" role="alert">
              <h3>We couldn&apos;t load your links</h3>
              <p>{loadError}</p>
              <button className="button button-primary" onClick={loadLinks}>
                Try again
              </button>
            </div>
          ) : links.length === 0 ? (
            <div className="empty-dashboard">
              <div className="feature-icon">
                <Link2 size={24} />
              </div>
              <h2>
                {search ? "No matching links" : "Your links will live here"}
              </h2>
              <p>
                {search
                  ? "Try a different search phrase."
                  : "Create your first short link to begin collecting useful insights."}
              </p>
              {!search && (
                <button
                  className="button button-accent"
                  onClick={() => setShowCreate(true)}
                  type="button"
                >
                  Create your first link
                </button>
              )}
            </div>
          ) : (
            <div className="link-list">
              {links.map((link) => (
                <LinkRow key={link.id} link={link} onDelete={deleteLink} />
              ))}
            </div>
          )}
        </section>
      </main>

      {showCreate && (
        <CreateLinkDialog
          onClose={() => setShowCreate(false)}
          onCreated={(link) => {
            setLinks((current) => [link, ...current]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="summary-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function LinkRow({ link, onDelete }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="link-row">
      <div className="link-avatar">
        <Link2 size={20} />
      </div>
      <div className="link-details">
        <a href={link.shortUrl} rel="noreferrer" target="_blank">
          {link.shortUrl} <ExternalLink size={14} />
        </a>
        <p title={link.destinationUrl}>{link.destinationUrl}</p>
      </div>
      <div className="link-meta">
        <strong>{link.clickCount}</strong>
        <span>clicks</span>
      </div>
      <div className="link-date">
        {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
          new Date(link.createdAt),
        )}
      </div>
      <div className="link-actions">
        <button aria-label="Copy short link" onClick={copyLink} type="button">
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
        <button
          aria-label="Delete short link"
          onClick={() => onDelete(link)}
          type="button"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  );
}

function CreateLinkDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ destinationUrl: "", customAlias: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      const data = await apiRequest("/api/links", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onCreated(data.link);
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(requestError.fields || {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="create-link-title"
        aria-modal="true"
        className="create-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <p className="section-kicker">New short link</p>
            <h2 id="create-link-title">Create a link</h2>
          </div>
          <button aria-label="Close dialog" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>
        {error && (
          <div className="form-alert" role="alert">
            {error}
          </div>
        )}
        <form className="auth-form" onSubmit={submit}>
          <DashboardField
            error={fieldErrors.destinationUrl?.[0]}
            label="Destination URL"
            name="destinationUrl"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                destinationUrl: event.target.value,
              }))
            }
            placeholder="https://example.com/your-long-url"
            type="url"
            value={form.destinationUrl}
          />
          <DashboardField
            error={fieldErrors.customAlias?.[0]}
            hint="Optional. Use 3–40 letters, numbers, hyphens, or underscores."
            label="Custom alias"
            name="customAlias"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                customAlias: event.target.value,
              }))
            }
            placeholder="summer-offer"
            value={form.customAlias}
          />
          <div className="dialog-actions">
            <button
              className="button button-ghost"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Creating..." : "Create short link"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DashboardField({ error, hint, label, name, ...inputProps }) {
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <input
        {...inputProps}
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
      />
      {error ? (
        <span className="field-error">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

function LinkSkeleton() {
  return (
    <div aria-label="Loading links" className="link-skeleton">
      <span />
      <span />
      <span />
    </div>
  );
}
