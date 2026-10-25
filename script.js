/**
 * Sales Dashboard — script.js
 * ─────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Load & parse 200_sales_data.csv
 *  2. Populate filter dropdowns dynamically
 *  3. Apply filters and update all KPI + charts
 *
 * Zero external dependencies beyond Chart.js (loaded via CDN).
 */

/* ================================================================
   GLOBAL STATE
   ================================================================ */
let rawData   = [];   // All rows parsed from CSV
let chartRefs = {};   // Holds Chart.js instances for destroy/recreate

/* ================================================================
   COLOUR PALETTE  — consistent across all charts
   ================================================================ */
const PALETTE = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#6366f1'
];

/* ================================================================
   ENTRY POINT — fetch CSV then bootstrap
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Fetch the CSV that lives beside index.html
  fetch('200_sales_data.csv')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status} — could not load CSV`);
      return res.text();
    })
    .then(csv => {
      rawData = parseCSV(csv);
      populateFilters(rawData);
      attachFilterListeners();
      updateDashboard();
    })
    .catch(err => {
      console.error('Failed to load CSV:', err);
      document.getElementById('record-badge').textContent = '⚠️ CSV load failed';
    });
});

/* ================================================================
   CSV PARSER
   ================================================================ */
/**
 * Converts a CSV string into an array of plain objects.
 * Handles numeric coercion for known numeric columns.
 * @param {string} csv - Raw CSV text
 * @returns {Object[]} - Array of row objects
 */
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  // Columns that should be treated as numbers
  const numericCols = new Set([
    'Product_ID', 'Sales_Amount', 'Quantity_Sold',
    'Unit_Cost', 'Unit_Price', 'Discount'
  ]);

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      const val = (values[i] || '').trim();
      row[h] = numericCols.has(h) ? parseFloat(val) : val;
    });
    return row;
  });
}

/* ================================================================
   FILTER HELPERS
   ================================================================ */
/**
 * Extracts unique values for a given column and appends
 * <option> elements to the corresponding <select>.
 */
function populateFilters(data) {
  const map = {
    'filter-region':   'Region',
    'filter-category': 'Product_Category',
    'filter-customer': 'Customer_Type',
    'filter-channel':  'Sales_Channel',
  };

  Object.entries(map).forEach(([selectId, column]) => {
    const select = document.getElementById(selectId);
    const unique = [...new Set(data.map(r => r[column]))].sort();
    unique.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
  });
}

/** Reads all four filter selects and returns a filter config object. */
function getFilters() {
  return {
    region:   document.getElementById('filter-region').value,
    category: document.getElementById('filter-category').value,
    customer: document.getElementById('filter-customer').value,
    channel:  document.getElementById('filter-channel').value,
  };
}

/**
 * Applies active filters to rawData and returns the filtered subset.
 * A row is included only if it matches ALL non-"all" filters.
 */
function applyFilters(filters) {
  return rawData.filter(row => {
    if (filters.region   !== 'all' && row.Region           !== filters.region)   return false;
    if (filters.category !== 'all' && row.Product_Category !== filters.category) return false;
    if (filters.customer !== 'all' && row.Customer_Type    !== filters.customer) return false;
    if (filters.channel  !== 'all' && row.Sales_Channel    !== filters.channel)  return false;
    return true;
  });
}

/** Wire up change events on all filters + reset button. */
function attachFilterListeners() {
  ['filter-region', 'filter-category', 'filter-customer', 'filter-channel']
    .forEach(id => {
      document.getElementById(id).addEventListener('change', updateDashboard);
    });

  document.getElementById('btn-reset').addEventListener('click', () => {
    ['filter-region', 'filter-category', 'filter-customer', 'filter-channel']
      .forEach(id => { document.getElementById(id).value = 'all'; });
    updateDashboard();
  });
}

/* ================================================================
   MAIN UPDATE — called on every filter change
   ================================================================ */
function updateDashboard() {
  const filters = getFilters();
  const data    = applyFilters(filters);

  updateRecordBadge(data.length);
  updateKPIs(data);
  renderTrendChart(data);
  renderRegionChart(data);
  renderCategoryChart(data);
  renderSalesRepChart(data);
  renderCustomerChart(data);
  renderPaymentChart(data);
  renderChannelChart(data);
  renderScatterChart(data);
  renderTop10Chart(data);
  renderQtyCategoryChart(data);
}

/* ================================================================
   RECORD BADGE
   ================================================================ */
function updateRecordBadge(count) {
  document.getElementById('record-badge').textContent =
    `${count.toLocaleString()} record${count !== 1 ? 's' : ''} shown`;
}

/* ================================================================
   KPI CALCULATIONS
   ================================================================ */
function updateKPIs(data) {
  const total    = rawData.length; // denominator for % comparisons

  const revenue  = data.reduce((s, r) => s + r.Sales_Amount, 0);
  const qty      = data.reduce((s, r) => s + r.Quantity_Sold, 0);
  const avgDisc  = data.length
    ? data.reduce((s, r) => s + r.Discount, 0) / data.length
    : 0;

  // Format helpers
  const fmt = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = n => (n * 100).toFixed(1) + '%';

  document.getElementById('kpi-revenue').textContent       = fmt(revenue);
  document.getElementById('kpi-transactions').textContent  = data.length.toLocaleString();
  document.getElementById('kpi-quantity').textContent      = qty.toLocaleString();
  document.getElementById('kpi-discount').textContent      = pct(avgDisc);

  // Sub-labels show share vs total dataset
  const share = total ? ((data.length / total) * 100).toFixed(1) : '100';
  document.getElementById('kpi-revenue-sub').textContent       = `${share}% of dataset`;
  document.getElementById('kpi-transactions-sub').textContent  = `out of ${total} total`;
  document.getElementById('kpi-quantity-sub').textContent      = `across ${data.length} txns`;
  document.getElementById('kpi-discount-sub').textContent      = `average rate`;
}

/* ================================================================
   CHART UTILITIES
   ================================================================ */
/**
 * Destroys an existing chart (if any) then creates a new one.
 * This prevents "Canvas already in use" errors on re-render.
 */
function createChart(id, config) {
  if (chartRefs[id]) {
    chartRefs[id].destroy();
  }
  const ctx = document.getElementById(id).getContext('2d');
  chartRefs[id] = new Chart(ctx, config);
}

/** Aggregates rows by a key column, summing a value column. */
function groupSum(data, keyCol, valCol) {
  const map = {};
  data.forEach(row => {
    const k = row[keyCol];
    map[k] = (map[k] || 0) + row[valCol];
  });
  // Sort descending by value
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
}

/** Aggregates rows by a key column, counting occurrences. */
function groupCount(data, keyCol) {
  const map = {};
  data.forEach(row => {
    const k = row[keyCol];
    map[k] = (map[k] || 0) + 1;
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
}

/* Shared Chart.js default options for clean axis formatting */
const axisDefaults = {
  grid: { color: '#f1f5f9' },
  ticks: { color: '#64748b', font: { size: 11 } }
};

/* ================================================================
   CHART 1 — Sales Trend (monthly)
   ================================================================ */
function renderTrendChart(data) {
  // Build a sorted month-bucket map
  const map = {};
  data.forEach(row => {
    const d = new Date(row.Sale_Date);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + row.Sales_Amount;
  });

  const sorted = Object.keys(map).sort();
  const labels = sorted.map(k => {
    const [y, m] = k.split('-');
    return new Date(+y, +m - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
  });
  const values = sorted.map(k => map[k]);

  createChart('chart-trend', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Monthly Revenue ($)',
        data: values,
        borderColor: PALETTE[0],
        backgroundColor: PALETTE[0] + '20',
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` $${ctx.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          }
        }
      },
      scales: {
        x: { ...axisDefaults },
        y: {
          ...axisDefaults,
          ticks: {
            ...axisDefaults.ticks,
            callback: v => '$' + (v / 1000).toFixed(0) + 'k'
          }
        }
      }
    }
  });
}

/* ================================================================
   CHART 2 — Revenue per Region (horizontal bar)
   ================================================================ */
function renderRegionChart(data) {
  const { labels, values } = groupSum(data, 'Region', 'Sales_Amount');

  // Semi-transparent fills so overlapping arcs remain readable
  const bgColors    = PALETTE.slice(0, labels.length).map(c => c + 'bb');
  const borderColors = PALETTE.slice(0, labels.length);

  createChart('chart-region', {
    type: 'polarArea',
    data: {
      labels,
      datasets: [{
        label: 'Revenue ($)',
        data: values,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#64748b',
            font: { size: 11 },
            padding: 12,
            boxWidth: 12,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = ((ctx.parsed.r / total) * 100).toFixed(1);
              return ` $${ctx.parsed.r.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${pct}%)`;
            }
          }
        }
      },
      scales: {
        r: {
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            backdropColor: 'transparent',
            callback: v => '$' + (v / 1000).toFixed(0) + 'k',
          },
          grid:      { color: '#e2e8f0' },
          angleLines: { color: '#e2e8f0' },
        }
      }
    }
  });
}

/* ================================================================
   CHART 3 — Revenue per Product Category (doughnut)
   ================================================================ */
function renderCategoryChart(data) {
  const { labels, values } = groupSum(data, 'Product_Category', 'Sales_Amount');

  createChart('chart-category', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: PALETTE.slice(0, labels.length),
        hoverOffset: 8,
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#64748b', font: { size: 11 }, padding: 12, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ` $${ctx.parsed.toLocaleString()} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/* ================================================================
   CHART 4 — Sales per Sales Representative (bar)
   ================================================================ */
function renderSalesRepChart(data) {
  const { labels, values } = groupSum(data, 'Sales_Rep', 'Sales_Amount');

  createChart('chart-salesrep', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue ($)',
        data: values,
        backgroundColor: PALETTE.slice(0, labels.length),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toLocaleString()}` } }
      },
      scales: {
        x: { ...axisDefaults },
        y: { ...axisDefaults, ticks: { ...axisDefaults.ticks, callback: v => '$'+(v/1000).toFixed(0)+'k' } }
      }
    }
  });
}

/* ================================================================
   CHART 5 — Customer Type Distribution (pie)
   ================================================================ */
function renderCustomerChart(data) {
  const { labels, values } = groupCount(data, 'Customer_Type');

  createChart('chart-customer', {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [PALETTE[0], PALETTE[1]],
        hoverOffset: 8,
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#64748b', font: { size: 11 }, padding: 14, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${ctx.parsed} txns (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/* ================================================================
   CHART 6 — Payment Method Usage (doughnut)
   ================================================================ */
function renderPaymentChart(data) {
  const { labels, values } = groupCount(data, 'Payment_Method');

  createChart('chart-payment', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: PALETTE.slice(0, labels.length),
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#64748b', font: { size: 10 }, padding: 10, boxWidth: 10 }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              return ` ${ctx.parsed} (${((ctx.parsed / total) * 100).toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });
}

/* ================================================================
   CHART 7 — Sales Channel Distribution (doughnut)
   ================================================================ */
function renderChannelChart(data) {
  const { labels, values } = groupCount(data, 'Sales_Channel');

  createChart('chart-channel', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [PALETTE[4], PALETTE[2]],
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#64748b', font: { size: 10 }, padding: 10, boxWidth: 10 }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              return ` ${ctx.parsed} txns (${((ctx.parsed / total) * 100).toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });
}

/* ================================================================
   CHART 8 — Discount vs Sales Amount (scatter)
   ================================================================ */
function renderScatterChart(data) {
  // Build one point per row: x = Discount (%), y = Sales_Amount
  const points = data.map(row => ({
    x: parseFloat((row.Discount * 100).toFixed(1)),
    y: row.Sales_Amount
  }));

  createChart('chart-scatter', {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Transaction',
        data: points,
        backgroundColor: PALETTE[0] + '55',
        borderColor: PALETTE[0],
        borderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` Disc: ${ctx.parsed.x}% | Sales: $${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          ...axisDefaults,
          title: { display: true, text: 'Discount (%)', color: '#94a3b8', font: { size: 10 } },
          ticks: { ...axisDefaults.ticks, callback: v => v + '%' }
        },
        y: {
          ...axisDefaults,
          title: { display: true, text: 'Sales ($)', color: '#94a3b8', font: { size: 10 } },
          ticks: { ...axisDefaults.ticks, callback: v => '$'+(v/1000).toFixed(0)+'k' }
        }
      }
    }
  });
}

/* ================================================================
   CHART 9 — Top 10 Highest Sales Transactions (horizontal bar)
   ================================================================ */
function renderTop10Chart(data) {
  // Sort descending, take top 10
  const top10 = [...data]
    .sort((a, b) => b.Sales_Amount - a.Sales_Amount)
    .slice(0, 10);

  const labels = top10.map(r => `${r.Sales_Rep} (${r.Product_Category})`);
  const values = top10.map(r => r.Sales_Amount);

  createChart('chart-top10', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Sales Amount ($)',
        data: values,
        backgroundColor: PALETTE.slice(0, 10),
        borderRadius: 5,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.x.toLocaleString()}` } }
      },
      scales: {
        x: { ...axisDefaults, ticks: { ...axisDefaults.ticks, callback: v => '$'+(v/1000).toFixed(0)+'k' } },
        y: { ...axisDefaults, ticks: { ...axisDefaults.ticks, font: { size: 10 } } }
      }
    }
  });
}

/* ================================================================
   CHART 10 — Quantity Sold per Category (bar)
   ================================================================ */
function renderQtyCategoryChart(data) {
  const { labels, values } = groupSum(data, 'Product_Category', 'Quantity_Sold');

  createChart('chart-qty-category', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Qty Sold',
        data: values,
        backgroundColor: PALETTE.slice(0, labels.length),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()} units` } }
      },
      scales: {
        x: { ...axisDefaults },
        y: { ...axisDefaults }
      }
    }
  });
}
