import {
  ArrowRight,
  BarChart3,
  Link2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import Brand from "./components/Brand.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const PublicStatsPage = lazy(() => import("./pages/PublicStatsPage.jsx"));
const BulkPage = lazy(() => import("./pages/BulkPage.jsx"));

const features = [
  {
    icon: Link2,
    title: "Links that stay flexible",
    text: "Create memorable short links and update their destination whenever plans change.",
  },
  {
    icon: BarChart3,
    title: "Analytics you can use",
    text: "Understand clicks, devices, locations, and daily trends from one clear dashboard.",
  },
  {
    icon: QrCode,
    title: "Ready for every channel",
    text: "Turn every link into a downloadable QR code for digital and printed campaigns.",
  },
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route
        path="/dashboard/links/:id"
        element={
          <Suspense
            fallback={<div className="page-loader">Loading analytics...</div>}
          >
            <AnalyticsPage />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
      <Route
        path="/stats/:shortCode"
        element={
          <Suspense
            fallback={
              <div className="page-loader">Loading public stats...</div>
            }
          >
            <PublicStatsPage />
          </Suspense>
        }
      />
      <Route
        path="/dashboard/bulk"
        element={
          <Suspense
            fallback={<div className="page-loader">Loading importer...</div>}
          >
            <BulkPage />
          </Suspense>
        }
      />
    </Routes>
  );
}

function LandingPage() {
  const [destination, setDestination] = useState("");
  const navigate = useNavigate();

  function startShortening(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    sessionStorage.setItem("pendingDestination", destination);
    navigate("/signup");
  }

  return (
    <div className="site-shell">
      <header className="nav">
        <Brand />
        <nav aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#security">Security</a>
        </nav>
        <div className="nav-actions">
          <Link className="button button-ghost" to="/login">
            Log in
          </Link>
          <Link className="button button-primary" to="/signup">
            Start free
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">
            <span />
            Short links. Clear results.
          </div>
          <h1>
            Make every link
            <strong> work harder.</strong>
          </h1>
          <p className="hero-copy">
            Create branded short links, share them anywhere, and understand
            every click with a beautifully simple analytics workspace.
          </p>
          <form className="shortener-card" onSubmit={startShortening}>
            <label htmlFor="destination">Paste a long URL</label>
            <div className="shortener-row">
              <input
                id="destination"
                name="destination"
                placeholder="https://example.com/your-very-long-link"
                required
                type="url"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              />
              <button className="button button-accent" type="submit">
                Shorten link <ArrowRight size={18} />
              </button>
            </div>
            <p>Create an account to save links and unlock full analytics.</p>
          </form>
          <div className="trust-row">
            <ShieldCheck size={18} />
            Secure by design
            <span />
            No credit card required
            <span />
            Every bonus feature included
          </div>
        </section>

        <section className="features" id="features">
          <div className="section-heading">
            <p>Everything in one place</p>
            <h2>From first click to full picture</h2>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article className="feature-card" key={title}>
                <div className="feature-icon">
                  <Icon size={24} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="security-band" id="security">
          <div>
            <p className="section-kicker">Built responsibly</p>
            <h2>Good links deserve thoughtful security.</h2>
          </div>
          <p>
            Linkora is built against the OWASP Top 10 with ownership isolation,
            strict validation, secure sessions, and privacy-aware analytics.
          </p>
        </section>
      </main>

      <footer>
        <Brand />
        <p>Smarter links, presented simply.</p>
        <p>&copy; 2026 Linkora</p>
      </footer>
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <Brand />
      <p className="section-kicker">404 · Lost link</p>
      <h1>This page took a wrong turn.</h1>
      <p>The address may be incorrect, or the page may have moved.</p>
      <Link className="button button-primary" to="/">
        Return home
      </Link>
    </main>
  );
}
