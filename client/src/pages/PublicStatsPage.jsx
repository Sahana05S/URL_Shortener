import { BarChart3, CalendarDays, MousePointerClick } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, useParams } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { apiRequest } from "../lib/api.js";

export default function PublicStatsPage() {
  const { shortCode } = useParams();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/api/public/stats/${encodeURIComponent(shortCode)}`)
      .then(setStats)
      .catch((requestError) => setError(requestError.message));
  }, [shortCode]);

  return (
    <div className="public-stats-page">
      <header className="public-stats-nav">
        <Brand />
        <Link className="button button-primary" to="/signup">
          Create your own link
        </Link>
      </header>
      <main className="public-stats-main">
        {error ? (
          <div className="panel-state">
            <h1>Statistics unavailable</h1>
            <p>{error}</p>
          </div>
        ) : !stats ? (
          <div className="page-loader">Loading public statistics...</div>
        ) : (
          <>
            <p className="section-kicker">Public link report</p>
            <h1>Performance for /{stats.link.shortCode}</h1>
            <p className="public-stats-intro">
              An aggregate view shared by this link&apos;s owner. Visitor-level
              details remain private.
            </p>
            <section className="analytics-summary">
              <PublicMetric
                icon={MousePointerClick}
                label="Total clicks"
                value={stats.link.clickCount}
              />
              <PublicMetric
                icon={CalendarDays}
                label="Created"
                value={new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                }).format(new Date(stats.link.createdAt))}
              />
              <PublicMetric
                icon={BarChart3}
                label="Last visited"
                value={
                  stats.link.lastVisitedAt
                    ? new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(stats.link.lastVisitedAt))
                    : "Never"
                }
              />
            </section>
            <section className="chart-card public-chart">
              <div className="chart-heading">
                <h2>Clicks over the last 30 days</h2>
                <p>Daily aggregate traffic</p>
              </div>
              <div className="chart-container">
                <ResponsiveContainer height="100%" width="100%">
                  <AreaChart data={stats.dailyClicks}>
                    <CartesianGrid stroke="#eee8ef" strokeDasharray="4 4" />
                    <XAxis
                      axisLine={false}
                      dataKey="date"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Area
                      dataKey="clicks"
                      fill="#FFF1D3"
                      stroke="#CA5995"
                      strokeWidth={3}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function PublicMetric({ icon: Icon, label, value }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Icon size={21} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
