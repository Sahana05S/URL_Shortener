import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const readme = fs.readFileSync(path.join(repositoryRoot, "README.md"), "utf8");
const failures = [];

const liveUrl = findMarkdownValue(readme, "Live application");
if (!/^https:\/\/[a-z0-9-]+\.onrender\.com(?:\/)?$/i.test(liveUrl)) {
  failures.push(
    "README live application must contain the final https://<service>.onrender.com URL.",
  );
}

const videoUrl = findMarkdownValue(readme, "Loom/YouTube walkthrough");
if (
  !/^https:\/\/(?:www\.)?(?:loom\.com\/share\/|youtube\.com\/watch\?|youtu\.be\/)/i.test(
    videoUrl,
  )
) {
  failures.push(
    "README must contain a public Loom or YouTube walkthrough URL.",
  );
}

const requiredEvidence = [
  "landing.png",
  "dashboard.png",
  "analytics.png",
  "mobile.png",
  "csv-import.png",
  "database.png",
  "security-checks.png",
  "demo-output.md",
];
for (const filename of requiredEvidence) {
  const evidencePath = path.join(repositoryRoot, "docs", "evidence", filename);
  if (!fs.existsSync(evidencePath) || fs.statSync(evidencePath).size === 0) {
    failures.push(`Missing deployed evidence: docs/evidence/${filename}`);
  }
}

const requiredFinalLine =
  "This project is a part of a hackathon run by https://katomaran.com";
if (readme.trimEnd().split(/\r?\n/).at(-1) !== requiredFinalLine) {
  failures.push("README does not end with the exact required Katomaran line.");
}

if (failures.length) {
  console.error("Submission is not ready:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Submission artifacts are complete.");
}

function findMarkdownValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`- \\*\\*${escaped}:\\*\\*\\s*(.+)`));
  return match?.[1]?.trim() || "";
}
