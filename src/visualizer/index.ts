import type { Report } from '../types/index.js';

// Implementation coming in Phase 5
export async function visualize(_report: Report): Promise<void> {
  throw new Error('Not implemented');
}

export function generateHTML(report: Report): string {
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const title = `Tracemark Report – ${esc(report.meta.timestamp)}`;
  const domainSections = report.domains.map(domain => {
    const urlRows = domain.urls.map(u =>
      `<tr><td>${esc(u.url)}</td><td>${esc(u.status)}</td></tr>`
    ).join('\n');
    return `<h2>${esc(domain.name)}</h2>\n<table><thead><tr><th>URL</th><th>Status</th></tr></thead><tbody>${urlRows}</tbody></table>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body>
<h1>${title}</h1>
<p>Version: ${esc(report.meta.version)} | Warm runs: ${report.meta.config.warmRuns} | Scenarios: ${esc(report.meta.config.scenarios.join(', '))}</p>
${domainSections}
</body>
</html>`;
}
