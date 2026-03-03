import type { Report } from '../types/index.js';

export function generateHTML(report: Report): string {
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const timestamp = esc(report.meta.timestamp);
  const jsonData = JSON.stringify(report);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tracemark Report – ${timestamp}</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js" defer><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; color: #1f2937; line-height: 1.5; }
    .header { background: #1e293b; color: #fff; padding: 1.25rem 2rem; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 1.25rem; font-weight: 600; }
    .header .meta { font-size: 0.8rem; color: #94a3b8; }
    .container { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
    .tabs { display: flex; gap: 0.25rem; border-bottom: 2px solid #e5e7eb; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .tab { padding: 0.5rem 1rem; cursor: pointer; border: none; background: none; font-size: 0.9rem; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
    .tab:hover { color: #374151; }
    .tab.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }
    .card { background: #fff; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.25rem; margin-bottom: 1.25rem; }
    .card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #374151; }
    .grid { display: grid; gap: 1rem; }
    .grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .grid-3 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
    .grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .metric-card { text-align: center; padding: 1rem; }
    .metric-card .value { font-size: 1.75rem; font-weight: 700; }
    .metric-card .label { font-size: 0.8rem; color: #6b7280; margin-top: 0.25rem; }
    .metric-card .domain-name { font-size: 0.75rem; color: #9ca3af; }
    .chart-container { width: 100%; min-height: 320px; }
    .chart-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; cursor: pointer; user-select: none; }
    th:hover { background: #f3f4f6; }
    tr:hover td { background: #f9fafb; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-yellow { background: #fef9c3; color: #854d0e; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .toggle-group { display: inline-flex; border: 1px solid #d1d5db; border-radius: 0.5rem; overflow: hidden; font-size: 0.8rem; }
    .toggle-btn { padding: 0.35rem 0.75rem; cursor: pointer; border: none; background: #fff; color: #6b7280; transition: all 0.15s; }
    .toggle-btn.active { background: #2563eb; color: #fff; }
    .section-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #1f2937; }
    .domain-selector { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .domain-btn { padding: 0.35rem 0.75rem; border-radius: 0.5rem; border: 1px solid #d1d5db; cursor: pointer; font-size: 0.8rem; background: #fff; transition: all 0.15s; }
    .domain-btn.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; font-weight: 600; }
    .url-link { color: #2563eb; cursor: pointer; text-decoration: underline; }
    .url-link:hover { color: #1d4ed8; }
    .back-btn { display: inline-flex; align-items: center; gap: 0.25rem; color: #2563eb; cursor: pointer; font-size: 0.85rem; margin-bottom: 1rem; background: none; border: none; }
    .back-btn:hover { text-decoration: underline; }
    .empty { color: #9ca3af; font-style: italic; padding: 2rem; text-align: center; }
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .chart-container { min-height: 250px; }
    }
  </style>
</head>
<body x-data="tracemarkApp()" x-init="initCharts()">

  <div class="header">
    <div>
      <h1>Tracemark Report</h1>
      <div class="meta">${timestamp} &middot; v${esc(report.meta.version)} &middot; ${esc(String(report.meta.config.warmRuns))} warm runs &middot; Scenarios: ${esc(report.meta.config.scenarios.join(', '))}</div>
    </div>
    <div class="toggle-group">
      <button class="toggle-btn" :class="{ active: runType === 'cold' }" @click="setRunType('cold')">Cold</button>
      <button class="toggle-btn" :class="{ active: runType === 'warm' }" @click="setRunType('warm')">Warm</button>
    </div>
  </div>

  <div class="container">
    <!-- Main Tabs -->
    <div class="tabs">
      <template x-for="t in mainTabs" :key="t.id">
        <button class="tab" :class="{ active: activeTab === t.id }" @click="setTab(t.id)" x-text="t.label"></button>
      </template>
    </div>

    <!-- Domain selector (shown on all tabs except overview) -->
    <template x-if="activeTab !== 'overview' && !selectedUrl">
      <div class="domain-selector">
        <button class="domain-btn" :class="{ active: selectedDomain === -1 }" @click="selectDomain(-1)">All Domains</button>
        <template x-for="(d, i) in domains" :key="i">
          <button class="domain-btn" :class="{ active: selectedDomain === i }" @click="selectDomain(i)" x-text="d.name"></button>
        </template>
      </div>
    </template>

    <!-- URL Drilldown View -->
    <template x-if="selectedUrl">
      <div>
        <button class="back-btn" @click="selectedUrl = null; $nextTick(() => renderAllCharts())">&#8592; Back to overview</button>
        <h2 class="section-title" x-text="selectedUrl.url" style="word-break: break-all;"></h2>
        <template x-if="selectedUrl.status === 'error'">
          <div class="card"><p style="color:#dc2626;">Error: <span x-text="selectedUrl.error || 'Unknown error'"></span></p></div>
        </template>
        <template x-if="selectedUrl.status === 'ok'">
          <div>
            <div class="card">
              <h3>Bundle Breakdown</h3>
              <div id="drilldown-bundles" class="chart-container" style="min-height:400px;"></div>
            </div>
            <div class="card">
              <h3>CSS Framework Hints</h3>
              <div id="drilldown-css-hints" class="chart-container" style="min-height:250px;"></div>
            </div>
            <div class="card">
              <h3>All Bundles</h3>
              <table>
                <thead><tr><th>URL</th><th>Classification</th><th>Transfer Size</th><th>Unused</th><th>Lazy</th></tr></thead>
                <tbody>
                  <template x-for="b in getDrilldownBundles()" :key="b.url">
                    <tr>
                      <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" x-text="b.url"></td>
                      <td><span class="badge badge-blue" x-text="b.classification"></span></td>
                      <td x-text="formatBytes(b.transferSize)"></td>
                      <td x-text="formatPercent(b.unusedRatio)"></td>
                      <td x-text="b.isLazy ? 'Yes' : 'No'"></td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- ========== OVERVIEW TAB ========== -->
    <template x-if="activeTab === 'overview' && !selectedUrl">
      <div>
        <div class="section-title">Dashboard</div>
        <div class="grid grid-4">
          <template x-for="(mc, i) in getOverviewCards()" :key="i">
            <div class="card metric-card">
              <div class="value" :style="{ color: mc.color || '#1f2937' }" x-text="mc.value"></div>
              <div class="label" x-text="mc.label"></div>
              <div class="domain-name" x-text="mc.domain"></div>
            </div>
          </template>
        </div>
        <div class="card">
          <h3>All URLs</h3>
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>URL</th>
                <th>Status</th>
                <th @click="sortTable('score')">Perf Score</th>
                <th @click="sortTable('js')">JS Size</th>
                <th @click="sortTable('css')">CSS Size</th>
                <th @click="sortTable('lcp')">LCP</th>
                <th @click="sortTable('fcp')">FCP</th>
              </tr>
            </thead>
            <tbody>
              <template x-for="row in getSortedUrlRows()" :key="row.domain + row.url">
                <tr>
                  <td x-text="row.domain"></td>
                  <td><span class="url-link" @click="openUrlDrilldown(row.domainIdx, row.urlIdx)" x-text="row.url"></span></td>
                  <td><span class="badge" :class="row.status === 'ok' ? 'badge-green' : 'badge-red'" x-text="row.status"></span></td>
                  <td :style="{ color: getScoreColor(row.score) }" x-text="row.scoreDisplay"></td>
                  <td x-text="row.jsDisplay"></td>
                  <td x-text="row.cssDisplay"></td>
                  <td x-text="row.lcpDisplay"></td>
                  <td x-text="row.fcpDisplay"></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ========== LIGHTHOUSE TAB ========== -->
    <template x-if="activeTab === 'lighthouse' && !selectedUrl">
      <div>
        <div class="section-title">Lighthouse Performance</div>
        <div class="chart-row">
          <template x-for="(d, i) in getVisibleDomains()" :key="'gauge-'+i">
            <div class="card">
              <h3 x-text="d.name + ' – Performance Score'"></h3>
              <div :id="'gauge-'+i" class="chart-container" style="min-height:250px;"></div>
            </div>
          </template>
        </div>
        <div class="card">
          <h3>Web Vitals Comparison</h3>
          <div id="chart-vitals" class="chart-container" style="min-height:380px;"></div>
        </div>
        <div class="card">
          <h3>CLS Comparison</h3>
          <div id="chart-cls" class="chart-container" style="min-height:300px;"></div>
        </div>
      </div>
    </template>

    <!-- ========== HTML PAYLOAD TAB ========== -->
    <template x-if="activeTab === 'html' && !selectedUrl">
      <div>
        <div class="section-title">HTML Payload</div>
        <div class="card">
          <h3>Transfer Size: Compressed vs Uncompressed</h3>
          <div id="chart-html-size" class="chart-container"></div>
        </div>
        <div class="card">
          <h3>Rendering Mode</h3>
          <div class="grid grid-3">
            <template x-for="item in getSSRIndicators()" :key="item.domain">
              <div class="card metric-card">
                <div class="value"><span class="badge" :class="item.isSSR ? 'badge-green' : 'badge-yellow'" x-text="item.isSSR ? 'SSR' : 'CSR'"></span></div>
                <div class="label" x-text="item.domain"></div>
                <div class="domain-name" x-text="(item.hasRSC ? 'RSC ' : '') + (item.hasNextData ? 'Next.js' : '')"></div>
              </div>
            </template>
          </div>
        </div>
        <div class="card">
          <h3>Inline Scripts</h3>
          <div id="chart-inline-scripts" class="chart-container"></div>
        </div>
        <div class="card">
          <h3>Preload &amp; Prefetch Hints</h3>
          <div id="chart-hints" class="chart-container"></div>
        </div>
      </div>
    </template>

    <!-- ========== JAVASCRIPT TAB ========== -->
    <template x-if="activeTab === 'javascript' && !selectedUrl">
      <div>
        <div class="section-title">JavaScript Bundles</div>
        <div class="card">
          <h3>Total JS Size</h3>
          <div id="chart-js-total" class="chart-container"></div>
        </div>
        <div class="chart-row">
          <template x-for="(d, i) in getVisibleDomains()" :key="'jsdonut-'+i">
            <div class="card">
              <h3 x-text="d.name + ' – Unused JS'"></h3>
              <div :id="'jsdonut-'+i" class="chart-container" style="min-height:250px;"></div>
            </div>
          </template>
        </div>
        <div class="card">
          <h3>Bundle Breakdown by Classification</h3>
          <div id="chart-bundle-breakdown" class="chart-container"></div>
        </div>
        <div class="card">
          <h3>Initial vs Lazy Chunks</h3>
          <div id="chart-lazy-initial" class="chart-container"></div>
        </div>
        <div class="card">
          <h3>Chunk Statistics</h3>
          <div id="chart-chunk-stats" class="chart-container"></div>
        </div>
      </div>
    </template>

    <!-- ========== CSS TAB ========== -->
    <template x-if="activeTab === 'css' && !selectedUrl">
      <div>
        <div class="section-title">CSS Analysis</div>
        <div class="card">
          <h3>Total CSS Size</h3>
          <div id="chart-css-total" class="chart-container"></div>
        </div>
        <div class="chart-row">
          <template x-for="(d, i) in getVisibleDomains()" :key="'cssdonut-'+i">
            <div class="card">
              <h3 x-text="d.name + ' – Unused CSS'"></h3>
              <div :id="'cssdonut-'+i" class="chart-container" style="min-height:250px;"></div>
            </div>
          </template>
        </div>
        <div class="card">
          <h3>Inline Styles</h3>
          <div id="chart-inline-styles" class="chart-container"></div>
        </div>
        <div class="card">
          <h3>CSS Framework Hints</h3>
          <div id="chart-css-frameworks" class="chart-container"></div>
        </div>
      </div>
    </template>
  </div>

  <script>
    var REPORT_DATA = ${jsonData};

    function tracemarkApp() {
      return {
        activeTab: 'overview',
        selectedDomain: -1,
        runType: 'cold',
        selectedUrl: null,
        sortCol: null,
        sortAsc: true,
        charts: {},
        domains: REPORT_DATA.domains,

        mainTabs: [
          { id: 'overview', label: 'Overview' },
          { id: 'lighthouse', label: 'Lighthouse' },
          { id: 'html', label: 'HTML Payload' },
          { id: 'javascript', label: 'JavaScript' },
          { id: 'css', label: 'CSS' }
        ],

        /* ---- Helpers ---- */
        formatBytes: formatBytes,
        formatMs: formatMs,
        formatPercent: formatPercent,
        getScoreColor: getScoreColor,

        /* ---- Navigation ---- */
        setTab(id) { this.activeTab = id; this.selectedUrl = null; this.$nextTick(() => this.renderAllCharts()); },
        setRunType(t) { this.runType = t; this.$nextTick(() => this.renderAllCharts()); },
        selectDomain(i) { this.selectedDomain = i; this.$nextTick(() => this.renderAllCharts()); },

        getVisibleDomains() {
          if (this.selectedDomain === -1) return this.domains;
          return [this.domains[this.selectedDomain]];
        },

        openUrlDrilldown(dIdx, uIdx) {
          this.selectedUrl = this.domains[dIdx].urls[uIdx];
          this.$nextTick(() => this.renderDrilldown());
        },

        /* ---- Data Extraction ---- */
        getFirstOkUrl(domain) {
          return domain.urls.find(u => u.status === 'ok') || null;
        },

        getLH(urlResult, runType) {
          if (!urlResult || urlResult.status !== 'ok') return null;
          var s = urlResult.scenarios;
          if (!s || !s.full || !s.full.lighthouse) return null;
          return runType === 'cold' ? s.full.lighthouse.cold : s.full.lighthouse.warm;
        },

        getPW(urlResult, runType) {
          if (!urlResult || urlResult.status !== 'ok') return null;
          var s = urlResult.scenarios;
          if (!s || !s.full || !s.full.playwright) return null;
          return runType === 'cold' ? s.full.playwright.cold : (s.full.playwright.warmAvg || null);
        },

        getAuditValue(lh, key) {
          if (!lh || !lh.audits || !lh.audits[key]) return null;
          return lh.audits[key].numericValue;
        },

        /* ---- Overview Cards ---- */
        getOverviewCards() {
          var cards = [];
          var self = this;
          this.domains.forEach(function(d) {
            var u = self.getFirstOkUrl(d);
            var lh = self.getLH(u, self.runType);
            var pw = self.getPW(u, self.runType);
            var score = lh ? lh.performanceScore : null;
            var scoreNum = score != null ? Math.round(score * 100) : null;
            cards.push({ value: scoreNum != null ? scoreNum : '–', label: 'Perf Score', domain: d.name, color: scoreNum != null ? getScoreColor(scoreNum) : '#9ca3af' });
            cards.push({ value: pw && pw.javascript ? formatBytes(pw.javascript.transferSize) : '–', label: 'JS Total', domain: d.name, color: '#5470c6' });
            cards.push({ value: pw && pw.css ? formatBytes(pw.css.transferSize) : '–', label: 'CSS Total', domain: d.name, color: '#91cc75' });
            var lcp = self.getAuditValue(lh, 'largest-contentful-paint');
            cards.push({ value: lcp != null ? formatMs(lcp) : '–', label: 'LCP', domain: d.name, color: '#fac858' });
          });
          return cards;
        },

        /* ---- Sortable URL Table ---- */
        sortTable(col) {
          if (this.sortCol === col) { this.sortAsc = !this.sortAsc; }
          else { this.sortCol = col; this.sortAsc = true; }
        },

        getSortedUrlRows() {
          var self = this;
          var rows = [];
          this.domains.forEach(function(d, dIdx) {
            d.urls.forEach(function(u, uIdx) {
              var lh = self.getLH(u, self.runType);
              var pw = self.getPW(u, self.runType);
              var score = lh ? Math.round(lh.performanceScore * 100) : null;
              var js = pw && pw.javascript ? pw.javascript.transferSize : null;
              var css = pw && pw.css ? pw.css.transferSize : null;
              var lcp = self.getAuditValue(lh, 'largest-contentful-paint');
              var fcp = self.getAuditValue(lh, 'first-contentful-paint');
              rows.push({
                domain: d.name, url: u.url, status: u.status,
                domainIdx: dIdx, urlIdx: uIdx,
                score: score, scoreDisplay: score != null ? String(score) : '–',
                js: js, jsDisplay: js != null ? formatBytes(js) : '–',
                css: css, cssDisplay: css != null ? formatBytes(css) : '–',
                lcp: lcp, lcpDisplay: lcp != null ? formatMs(lcp) : '–',
                fcp: fcp, fcpDisplay: fcp != null ? formatMs(fcp) : '–'
              });
            });
          });
          if (self.sortCol) {
            var col = self.sortCol;
            var asc = self.sortAsc ? 1 : -1;
            rows.sort(function(a, b) {
              var va = a[col]; var vb = b[col];
              if (va == null && vb == null) return 0;
              if (va == null) return 1;
              if (vb == null) return -1;
              return va > vb ? asc : va < vb ? -asc : 0;
            });
          }
          return rows;
        },

        /* ---- SSR Indicators ---- */
        getSSRIndicators() {
          var self = this;
          var items = [];
          this.getVisibleDomains().forEach(function(d) {
            var u = self.getFirstOkUrl(d);
            var pw = self.getPW(u, 'cold');
            items.push({
              domain: d.name,
              isSSR: pw && pw.html ? pw.html.isSSR : false,
              hasRSC: pw && pw.html ? pw.html.hasRSC : false,
              hasNextData: pw && pw.html ? pw.html.hasNextData : false
            });
          });
          return items;
        },

        /* ---- Drilldown ---- */
        getDrilldownBundles() {
          if (!this.selectedUrl || this.selectedUrl.status !== 'ok') return [];
          var pw = this.getPW(this.selectedUrl, this.runType);
          return pw && pw.javascript && pw.javascript.bundles ? pw.javascript.bundles : [];
        },

        renderDrilldown() {
          var self = this;
          var pw = self.getPW(self.selectedUrl, self.runType);
          if (!pw) return;

          /* Bundle horizontal bar */
          var bundles = pw.javascript && pw.javascript.bundles ? pw.javascript.bundles.slice().sort(function(a,b){ return b.transferSize - a.transferSize; }) : [];
          var classColors = { framework: '#5470c6', 'internal-page': '#91cc75', 'internal-shell': '#73c0de', internal: '#3ba272', vendor: '#fac858', external: '#ee6666', unknown: '#9a60b4' };
          self.renderChart('drilldown-bundles', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function(p) { var d = p[0]; return escHtml(d.name) + '<br/>Transfer: ' + formatBytes(d.value); } },
            grid: { left: 200, right: 30, top: 10, bottom: 30 },
            xAxis: { type: 'value', axisLabel: { formatter: function(v){ return formatBytes(v); } } },
            yAxis: { type: 'category', data: bundles.map(function(b){ var u = b.url; return u.length > 40 ? '...' + u.slice(-37) : u; }), inverse: true, axisLabel: { width: 180, overflow: 'truncate' } },
            series: [{ type: 'bar', data: bundles.map(function(b){ return { value: b.transferSize, itemStyle: { color: classColors[b.classification] || '#999' } }; }) }]
          });

          /* CSS framework hints */
          var hints = pw.css && pw.css.frameworkHints ? pw.css.frameworkHints : [];
          if (hints.length > 0) {
            self.renderChart('drilldown-css-hints', {
              tooltip: { trigger: 'axis', formatter: function(p) { return escHtml(p[0].name) + ': ' + (p[0].value * 100).toFixed(0) + '%'; } },
              grid: { left: 120, right: 30, top: 10, bottom: 30 },
              xAxis: { type: 'value', max: 1, axisLabel: { formatter: function(v){ return (v * 100) + '%'; } } },
              yAxis: { type: 'category', data: hints.map(function(h){ return h.framework; }) },
              series: [{ type: 'bar', data: hints.map(function(h){ return h.confidence; }), itemStyle: { color: '#5470c6' } }]
            });
          }
        },

        /* ---- Chart Rendering Engine ---- */
        initCharts() { var self = this; self.$nextTick(function() { self.renderAllCharts(); }); window.addEventListener('resize', function() { Object.keys(self.charts).forEach(function(k) { if (self.charts[k]) self.charts[k].resize(); }); }); },

        renderChart(id, option) {
          var el = document.getElementById(id);
          if (!el) return;
          if (this.charts[id]) { this.charts[id].dispose(); }
          var chart = echarts.init(el);
          chart.setOption(option);
          this.charts[id] = chart;
        },

        renderAllCharts() {
          var self = this;
          if (self.selectedUrl) { self.renderDrilldown(); return; }
          if (self.activeTab === 'lighthouse') self.renderLighthouseCharts();
          if (self.activeTab === 'html') self.renderHTMLCharts();
          if (self.activeTab === 'javascript') self.renderJSCharts();
          if (self.activeTab === 'css') self.renderCSSCharts();
        },

        /* ---- Lighthouse Charts ---- */
        renderLighthouseCharts() {
          var self = this;
          var visible = self.getVisibleDomains();

          /* Gauges */
          visible.forEach(function(d, i) {
            var u = self.getFirstOkUrl(d);
            var lh = self.getLH(u, self.runType);
            var score = lh ? Math.round(lh.performanceScore * 100) : 0;
            self.renderChart('gauge-' + i, {
              series: [{
                type: 'gauge', startAngle: 220, endAngle: -40, min: 0, max: 100,
                pointer: { show: true, length: '60%' },
                axisLine: { lineStyle: { width: 18, color: [[0.49, '#ee6666'], [0.89, '#fac858'], [1, '#91cc75']] } },
                axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                detail: { formatter: '{value}', fontSize: 28, offsetCenter: [0, '60%'], color: getScoreColor(score) },
                data: [{ value: score }]
              }]
            });
          });

          /* Web Vitals grouped bar */
          var categories = visible.map(function(d){ return d.name; });
          var metrics = ['first-contentful-paint', 'largest-contentful-paint', 'interactive', 'total-blocking-time', 'server-response-time'];
          var labels = ['FCP', 'LCP', 'TTI', 'TBT', 'TTFB'];
          var series = metrics.map(function(m, mi) {
            return {
              name: labels[mi], type: 'bar',
              data: visible.map(function(d) {
                var u = self.getFirstOkUrl(d);
                var lh = self.getLH(u, self.runType);
                return self.getAuditValue(lh, m) || 0;
              })
            };
          });
          self.renderChart('chart-vitals', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function(params) { var s = escHtml(params[0].axisValue); params.forEach(function(p) { s += '<br/>' + p.marker + ' ' + escHtml(p.seriesName) + ': ' + formatMs(p.value); }); return s; } },
            legend: { top: 0 },
            grid: { left: 80, right: 20, top: 40, bottom: 30 },
            xAxis: { type: 'category', data: categories },
            yAxis: { type: 'value', axisLabel: { formatter: function(v){ return formatMs(v); } } },
            color: COLORS,
            series: series
          });

          /* CLS */
          var clsSeries = [{
            name: 'CLS', type: 'bar',
            data: visible.map(function(d) {
              var u = self.getFirstOkUrl(d);
              var lh = self.getLH(u, self.runType);
              return self.getAuditValue(lh, 'cumulative-layout-shift') || 0;
            }),
            itemStyle: { color: '#ee6666' }
          }];
          self.renderChart('chart-cls', {
            tooltip: { trigger: 'axis', formatter: function(p) { return escHtml(p[0].axisValue) + '<br/>CLS: ' + p[0].value.toFixed(3); } },
            grid: { left: 80, right: 20, top: 10, bottom: 30 },
            xAxis: { type: 'category', data: categories },
            yAxis: { type: 'value' },
            series: clsSeries
          });
        },

        /* ---- HTML Payload Charts ---- */
        renderHTMLCharts() {
          var self = this;
          var visible = self.getVisibleDomains();
          var cats = visible.map(function(d){ return d.name; });

          /* Transfer vs Resource size */
          self.renderChart('chart-html-size', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function(params) { var s = escHtml(params[0].axisValue); params.forEach(function(p) { s += '<br/>' + p.marker + ' ' + escHtml(p.seriesName) + ': ' + formatBytes(p.value); }); return s; } },
            legend: { top: 0 },
            grid: { left: 80, right: 20, top: 40, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: { type: 'value', axisLabel: { formatter: function(v){ return formatBytes(v); } } },
            color: ['#5470c6', '#91cc75'],
            series: [
              { name: 'Compressed', type: 'bar', data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.html ? pw.html.transferSize : 0; }) },
              { name: 'Uncompressed', type: 'bar', data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.html ? pw.html.resourceSize : 0; }) }
            ]
          });

          /* Inline Scripts */
          self.renderChart('chart-inline-scripts', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { top: 0 },
            grid: { left: 80, right: 80, top: 40, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: [
              { type: 'value', name: 'Size', axisLabel: { formatter: function(v){ return formatBytes(v); } } },
              { type: 'value', name: 'Count', position: 'right' }
            ],
            color: ['#5470c6', '#fac858'],
            series: [
              { name: 'Total Size', type: 'bar', yAxisIndex: 0, data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.html && pw.html.inlineScripts ? pw.html.inlineScripts.totalSize : 0; }) },
              { name: 'Count', type: 'bar', yAxisIndex: 1, data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.html && pw.html.inlineScripts ? pw.html.inlineScripts.count : 0; }) }
            ]
          });

          /* Preload/Prefetch hints */
          var hintTypes = new Set();
          visible.forEach(function(d) {
            var u = self.getFirstOkUrl(d);
            var pw = self.getPW(u, 'cold');
            if (pw && pw.html) {
              Object.keys(pw.html.preloadHints || {}).forEach(function(k) { hintTypes.add(k); });
              Object.keys(pw.html.prefetchHints || {}).forEach(function(k) { hintTypes.add(k); });
            }
          });
          var hintArr = Array.from(hintTypes);
          var hintSeries = [];
          hintArr.forEach(function(ht, hi) {
            hintSeries.push({
              name: 'preload:' + ht, type: 'bar', stack: 'preload',
              data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, 'cold'); return pw && pw.html && pw.html.preloadHints ? (pw.html.preloadHints[ht] || 0) : 0; }),
              itemStyle: { color: COLORS[hi % COLORS.length] }
            });
            hintSeries.push({
              name: 'prefetch:' + ht, type: 'bar', stack: 'prefetch',
              data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, 'cold'); return pw && pw.html && pw.html.prefetchHints ? (pw.html.prefetchHints[ht] || 0) : 0; }),
              itemStyle: { color: COLORS[(hi + 3) % COLORS.length], opacity: 0.6 }
            });
          });
          self.renderChart('chart-hints', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { top: 0, type: 'scroll' },
            grid: { left: 80, right: 20, top: 40, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: { type: 'value', name: 'Count' },
            series: hintSeries
          });
        },

        /* ---- JavaScript Charts ---- */
        renderJSCharts() {
          var self = this;
          var visible = self.getVisibleDomains();
          var cats = visible.map(function(d){ return d.name; });

          /* Total JS */
          self.renderChart('chart-js-total', {
            tooltip: { trigger: 'axis', formatter: function(p) { return escHtml(p[0].axisValue) + '<br/>JS: ' + formatBytes(p[0].value); } },
            grid: { left: 80, right: 20, top: 10, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: { type: 'value', axisLabel: { formatter: function(v){ return formatBytes(v); } } },
            series: [{ type: 'bar', data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.javascript ? pw.javascript.transferSize : 0; }), itemStyle: { color: '#5470c6' } }]
          });

          /* Unused JS donuts */
          visible.forEach(function(d, i) {
            var u = self.getFirstOkUrl(d);
            var pw = self.getPW(u, self.runType);
            var total = pw && pw.javascript ? pw.javascript.resourceSize : 0;
            var unused = pw && pw.javascript ? pw.javascript.unusedBytes : 0;
            var used = Math.max(0, total - unused);
            self.renderChart('jsdonut-' + i, {
              tooltip: { trigger: 'item', formatter: function(p) { return escHtml(p.name) + ': ' + formatBytes(p.value) + ' (' + p.percent + '%)'; } },
              series: [{ type: 'pie', radius: ['45%', '70%'], label: { show: true, formatter: function(p) { return p.name + '\\n' + formatPercent(p.value / (total || 1)); } },
                data: [{ value: used, name: 'Used', itemStyle: { color: '#91cc75' } }, { value: unused, name: 'Unused', itemStyle: { color: '#ee6666' } }]
              }]
            });
          });

          /* Bundle breakdown stacked */
          var classifications = ['framework', 'vendor', 'internal', 'internal-page', 'internal-shell', 'external', 'unknown'];
          var classColors = { framework: '#5470c6', vendor: '#fac858', internal: '#3ba272', 'internal-page': '#91cc75', 'internal-shell': '#73c0de', external: '#ee6666', unknown: '#9a60b4' };
          var breakdownSeries = classifications.map(function(cls) {
            return {
              name: cls, type: 'bar', stack: 'bundle',
              data: visible.map(function(d) {
                var u = self.getFirstOkUrl(d);
                var pw = self.getPW(u, self.runType);
                var bundles = pw && pw.javascript && pw.javascript.bundles ? pw.javascript.bundles : [];
                var sum = 0; bundles.forEach(function(b) { if (b.classification === cls) sum += b.transferSize; }); return sum;
              }),
              itemStyle: { color: classColors[cls] }
            };
          });
          self.renderChart('chart-bundle-breakdown', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function(params) { var s = escHtml(params[0].axisValue); params.forEach(function(p) { if (p.value > 0) s += '<br/>' + p.marker + ' ' + escHtml(p.seriesName) + ': ' + formatBytes(p.value); }); return s; } },
            legend: { top: 0, type: 'scroll' },
            grid: { left: 80, right: 20, top: 40, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: { type: 'value', axisLabel: { formatter: function(v){ return formatBytes(v); } } },
            series: breakdownSeries
          });

          /* Lazy vs Initial */
          self.renderChart('chart-lazy-initial', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function(params) { var s = escHtml(params[0].axisValue); params.forEach(function(p) { s += '<br/>' + p.marker + ' ' + escHtml(p.seriesName) + ': ' + p.value; }); return s; } },
            legend: { top: 0 },
            grid: { left: 80, right: 20, top: 40, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: { type: 'value', name: 'Chunks' },
            color: ['#5470c6', '#91cc75'],
            series: [
              { name: 'Initial', type: 'bar', stack: 'chunks', data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.javascript && pw.javascript.chunks ? pw.javascript.chunks.initialCount : 0; }) },
              { name: 'Lazy', type: 'bar', stack: 'chunks', data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.javascript && pw.javascript.chunks ? pw.javascript.chunks.lazyCount : 0; }) }
            ]
          });

          /* Chunk stats */
          self.renderChart('chart-chunk-stats', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function(params) { var s = escHtml(params[0].axisValue); params.forEach(function(p) { s += '<br/>' + p.marker + ' ' + escHtml(p.seriesName) + ': ' + (p.seriesName === 'Count' ? p.value : formatBytes(p.value)); }); return s; } },
            legend: { top: 0 },
            grid: { left: 80, right: 80, top: 40, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: [
              { type: 'value', name: 'Size', axisLabel: { formatter: function(v){ return formatBytes(v); } } },
              { type: 'value', name: 'Count', position: 'right' }
            ],
            color: ['#fac858', '#ee6666', '#5470c6'],
            series: [
              { name: 'Median Size', type: 'bar', yAxisIndex: 0, data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.javascript && pw.javascript.chunks ? pw.javascript.chunks.medianSize : 0; }) },
              { name: 'Max Size', type: 'bar', yAxisIndex: 0, data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.javascript && pw.javascript.chunks ? pw.javascript.chunks.maxSize : 0; }) },
              { name: 'Count', type: 'bar', yAxisIndex: 1, data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.javascript && pw.javascript.chunks ? pw.javascript.chunks.total : 0; }) }
            ]
          });
        },

        /* ---- CSS Charts ---- */
        renderCSSCharts() {
          var self = this;
          var visible = self.getVisibleDomains();
          var cats = visible.map(function(d){ return d.name; });

          /* Total CSS */
          self.renderChart('chart-css-total', {
            tooltip: { trigger: 'axis', formatter: function(p) { return escHtml(p[0].axisValue) + '<br/>CSS: ' + formatBytes(p[0].value); } },
            grid: { left: 80, right: 20, top: 10, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: { type: 'value', axisLabel: { formatter: function(v){ return formatBytes(v); } } },
            series: [{ type: 'bar', data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.css ? pw.css.transferSize : 0; }), itemStyle: { color: '#91cc75' } }]
          });

          /* Unused CSS donuts */
          visible.forEach(function(d, i) {
            var u = self.getFirstOkUrl(d);
            var pw = self.getPW(u, self.runType);
            var total = pw && pw.css ? pw.css.resourceSize : 0;
            var unused = pw && pw.css ? pw.css.unusedBytes : 0;
            var used = Math.max(0, total - unused);
            self.renderChart('cssdonut-' + i, {
              tooltip: { trigger: 'item', formatter: function(p) { return escHtml(p.name) + ': ' + formatBytes(p.value) + ' (' + p.percent + '%)'; } },
              series: [{ type: 'pie', radius: ['45%', '70%'], label: { show: true, formatter: function(p) { return p.name + '\\n' + formatPercent(p.value / (total || 1)); } },
                data: [{ value: used, name: 'Used', itemStyle: { color: '#91cc75' } }, { value: unused, name: 'Unused', itemStyle: { color: '#ee6666' } }]
              }]
            });
          });

          /* Inline Styles */
          self.renderChart('chart-inline-styles', {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { top: 0 },
            grid: { left: 80, right: 80, top: 40, bottom: 30 },
            xAxis: { type: 'category', data: cats },
            yAxis: [
              { type: 'value', name: 'Size', axisLabel: { formatter: function(v){ return formatBytes(v); } } },
              { type: 'value', name: 'Count', position: 'right' }
            ],
            color: ['#91cc75', '#fac858'],
            series: [
              { name: 'Total Size', type: 'bar', yAxisIndex: 0, data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.css && pw.css.inline ? pw.css.inline.totalSize : 0; }) },
              { name: 'Count', type: 'bar', yAxisIndex: 1, data: visible.map(function(d) { var u = self.getFirstOkUrl(d); var pw = self.getPW(u, self.runType); return pw && pw.css && pw.css.inline ? pw.css.inline.count : 0; }) }
            ]
          });

          /* CSS Framework Hints */
          var hintMap = {};
          visible.forEach(function(d) {
            var u = self.getFirstOkUrl(d);
            var pw = self.getPW(u, 'cold');
            if (pw && pw.css && pw.css.frameworkHints) {
              pw.css.frameworkHints.forEach(function(h) {
                if (!hintMap[h.framework]) hintMap[h.framework] = {};
                hintMap[h.framework][d.name] = h.confidence;
              });
            }
          });
          var frameworks = Object.keys(hintMap);
          if (frameworks.length > 0) {
            var fwSeries = visible.map(function(d, di) {
              return {
                name: d.name, type: 'bar',
                data: frameworks.map(function(fw) { return hintMap[fw][d.name] || 0; }),
                itemStyle: { color: COLORS[di % COLORS.length] }
              };
            });
            self.renderChart('chart-css-frameworks', {
              tooltip: { trigger: 'axis', formatter: function(params) { var s = escHtml(params[0].axisValue); params.forEach(function(p) { if (p.value > 0) s += '<br/>' + p.marker + ' ' + escHtml(p.seriesName) + ': ' + (p.value * 100).toFixed(0) + '%'; }); return s; } },
              legend: { top: 0 },
              grid: { left: 120, right: 30, top: 40, bottom: 30 },
              yAxis: { type: 'category', data: frameworks },
              xAxis: { type: 'value', max: 1, axisLabel: { formatter: function(v){ return (v * 100) + '%'; } } },
              series: fwSeries
            });
          }
        }
      };
    }

    /* ---- Global Helpers ---- */
    var COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

    function formatBytes(bytes) {
      if (bytes == null || isNaN(bytes)) return '–';
      if (bytes === 0) return '0 B';
      var units = ['B', 'KB', 'MB', 'GB'];
      var i = 0;
      var v = bytes;
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
      return v.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    }

    function formatMs(ms) {
      if (ms == null || isNaN(ms)) return '–';
      if (ms >= 1000) return (ms / 1000).toFixed(1) + ' s';
      return Math.round(ms) + ' ms';
    }

    function formatPercent(ratio) {
      if (ratio == null || isNaN(ratio)) return '–';
      return Math.round(ratio * 100) + '%';
    }

    function getScoreColor(score) {
      if (score == null) return '#9ca3af';
      if (score >= 90) return '#0cce6b';
      if (score >= 50) return '#ffa400';
      return '#ff4e42';
    }

    function escHtml(s) {
      if (typeof s !== 'string') return String(s != null ? s : '');
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  <\/script>
</body>
</html>`;
}

