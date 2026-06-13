import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function BulkPage() {
  const { user, loading } = useAuth();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [importId, setImportId] = useState(() => crypto.randomUUID());

  if (loading) return <div className="page-loader">Loading importer...</div>;
  if (!user) return <Navigate to="/login" replace />;

  async function upload(mode) {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("mode", mode);
      body.append("importId", importId);
      const response = await fetch("/api/links/bulk", {
        method: "POST",
        credentials: "include",
        body,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message || "Upload failed.");
      setResult(payload.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Brand />
        <nav>
          <Link to="/dashboard">
            <ArrowLeft size={19} /> Back to links
          </Link>
          <Link className="active" to="/dashboard/bulk">
            <FileSpreadsheet size={19} /> Bulk import
          </Link>
        </nav>
      </aside>
      <main className="dashboard-main bulk-main">
        <p className="section-kicker">Bulk shortening</p>
        <h1>Turn a CSV into short links.</h1>
        <p className="bulk-intro">
          Preview every row before creation. Valid rows can still be processed
          when another row needs correction.
        </p>

        <section className="bulk-upload-card">
          <label className="file-drop">
            <Upload size={28} />
            <strong>{file ? file.name : "Choose a CSV file"}</strong>
            <span>Maximum 100 rows and 1 MB</span>
            <input
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files[0] || null);
                setResult(null);
                setError("");
                setImportId(crypto.randomUUID());
              }}
              type="file"
            />
          </label>
          <div className="csv-format">
            <strong>Required columns</strong>
            <code>original_url,custom_alias,expires_at,public_stats</code>
            <button
              className="template-link"
              onClick={downloadTemplate}
              type="button"
            >
              <Download size={15} /> Download template
            </button>
          </div>
          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}
          <button
            className="button button-primary"
            disabled={!file || submitting}
            onClick={() => upload("preview")}
            type="button"
          >
            {submitting ? "Checking..." : "Preview rows"}
          </button>
        </section>

        {result && (
          <section className="bulk-results">
            <header>
              <div>
                <h2>
                  {result.mode === "preview"
                    ? "Validation preview"
                    : "Import result"}
                </h2>
                <p>
                  {result.summary.total} rows · {result.summary.valid || 0}{" "}
                  valid · {result.summary.invalid || 0} invalid ·{" "}
                  {result.summary.created || 0} created
                </p>
              </div>
              <div className="bulk-actions">
                {result.mode === "preview" && result.summary.valid > 0 && (
                  <button
                    className="button button-accent"
                    disabled={submitting}
                    onClick={() => upload("process")}
                    type="button"
                  >
                    Create valid links
                  </button>
                )}
                {result.mode === "process" && (
                  <button
                    className="button button-ghost"
                    onClick={() => downloadResults(result.rows)}
                    type="button"
                  >
                    <Download size={17} /> Download results
                  </button>
                )}
              </div>
            </header>
            <div className="bulk-table-wrap">
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Destination</th>
                    <th>Alias</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.row}>
                      <td>{row.row}</td>
                      <td title={row.originalUrl}>{row.originalUrl}</td>
                      <td>{row.alias || "Generated"}</td>
                      <td>
                        <span className={`status-pill status-${row.status}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>{row.shortUrl || row.errors.join(" ") || "Ready"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function downloadTemplate() {
  downloadCsv("linkora-template.csv", [
    ["original_url", "custom_alias", "expires_at", "public_stats"],
    ["https://example.com/offer", "summer-offer", "", "false"],
  ]);
}

function downloadResults(rows) {
  downloadCsv("linkora-import-results.csv", [
    ["row", "original_url", "alias", "status", "short_url", "errors"],
    ...rows.map((row) => [
      row.row,
      row.originalUrl,
      row.alias,
      row.status,
      row.shortUrl || "",
      row.errors.join(" "),
    ]),
  ]);
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
