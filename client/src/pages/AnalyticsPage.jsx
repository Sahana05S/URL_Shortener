import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Link2,
  MousePointerClick,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, Navigate, useParams } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

const chartColors = ["#5D1C6A", "#CA5995", "#FFB090", "#EAC7DC", "#FFF1D3"];

export default function AnalyticsPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setError("");
    apiRequest(`/api/links/${id}/analytics?days=${days}`)
      .then(setAnalytics)
      .catch((requestError) => setError(requestError.message));
  }, [days, id, user]);

  if (loading) return <div className="page-loader">Loading analytics...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Brand />
        <nav>
          <Link to="/dashboard">
            <BarChart3 size={19} /> Overview
          </Link>
          <Link className="active" to="/dashboard">
            <Link2 size={19} /> Links
          </Link>
        </nav>
      </aside>
      <main className="dashboard-main analytics-main">
        <Link className="back-link analytics-back" to="/dashboard">
          <ArrowLeft size={17} /> Back to links
        </Link>
        {error ? (
          <div className="panel-state" role="alert">
            <h2>Analytics unavailable</h2>
            <p>{error}</p>
          </div>
        ) : !analytics ? (
          <AnalyticsSkeleton />
        ) : (
          <>
            <header className="analytics-header">
              <div>
                <p className="section-kicker">Link analytics</p>
                <h1>/{analytics.link.shortCode}</h1>
                <p>{analytics.link.destinationUrl}</p>
              </div>
              <select
                aria-label="Analytics period"
                onChange={(event) => setDays(Number(event.target.value))}
                value={days}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </header>

            <section className="analytics-summary">
              <Metric
                icon={MousePointerClick}
                label="Total clicks"
                value={analytics.link.clickCount}
              />
              <Metric
                icon={Users}
                label="Approx. daily visitors"
                value={analytics.approximateDailyVisitors}
              />
              <Metric
                icon={CalendarDays}
                label="Last visited"
                value={
                  analytics.link.lastVisitedAt
                    ? formatRelativeDate(analytics.link.lastVisitedAt)
                    : "Never"
                }
              />
            </section>

            <section className="analytics-grid">
              <article className="chart-card trend-card">
                <div className="chart-heading">
                  <h2>Daily clicks</h2>
                  <p>Traffic over the selected period</p>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart data={analytics.dailyClicks}>
                      <defs>
                        <linearGradient
                          id="clickGradient"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#CA5995"
                            stopOpacity={0.32}
                          />
                          <stop
                            offset="95%"
                            stopColor="#CA5995"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#eee8ef" strokeDasharray="4 4" />
                      <XAxis
                        axisLine={false}
                        dataKey="date"
                        fontSize={11}
                        tickFormatter={(value) =>
                          new Intl.DateTimeFormat(undefined, {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(`${value}T00:00:00`))
                        }
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
                        fill="url(#clickGradient)"
                        stroke="#CA5995"
                        strokeWidth={3}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <BreakdownCard data={analytics.devices} title="Devices" />
              <BreakdownList data={analytics.browsers} title="Browsers" />
              <BreakdownList data={analytics.countries} title="Countries" />
            </section>

            <section className="recent-card">
              <div className="chart-heading">
                <h2>Recent visits</h2>
                <p>The 20 most recent recorded clicks</p>
              </div>
              {analytics.recentVisits.length === 0 ? (
                <div className="recent-empty">No visits recorded yet.</div>
              ) : (
                <div className="visit-list">
                  {analytics.recentVisits.map((visit) => (
                    <div className="visit-row" key={visit.id}>
                      <span>{visit.deviceType || "Unknown device"}</span>
                      <span>{visit.browser || "Unknown browser"}</span>
                      <span>
                        {[visit.city, visit.country]
                          .filter(Boolean)
                          .join(", ") || "Unknown location"}
                      </span>
                      <time dateTime={visit.visitedAt}>
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(visit.visitedAt))}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
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

function BreakdownCard({ data, title }) {
  return (
    <article className="chart-card">
      <div className="chart-heading">
        <h2>{title}</h2>
        <p>Share of recorded clicks</p>
      </div>
      {data.length ? (
        <div className="donut-wrap">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={52}
                nameKey="name"
                outerRadius={82}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell
                    fill={chartColors[index % chartColors.length]}
                    key={entry.name}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="recent-empty">No data yet.</div>
      )}
    </article>
  );
}

function BreakdownList({ data, title }) {
  const max = data[0]?.value || 1;
  return (
    <article className="chart-card">
      <div className="chart-heading">
        <h2>{title}</h2>
        <p>Top sources in this period</p>
      </div>
      <div className="breakdown-list">
        {data.length ? (
          data.slice(0, 5).map((item) => (
            <div className="breakdown-row" key={item.name}>
              <span>{item.name}</span>
              <div>
                <i style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
              <strong>{item.value}</strong>
            </div>
          ))
        ) : (
          <div className="recent-empty">No data yet.</div>
        )}
      </div>
    </article>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="analytics-skeleton">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function formatRelativeDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
