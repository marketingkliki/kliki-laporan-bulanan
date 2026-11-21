// KLIKI Laporan Marketing — UI (paparan sahaja; kiraan dalam data.js & report.js)
// Susunan tab ikut Laporan Marketing Bulanan (disetujui Hafiz 14 Nov 2026).
(function () {
  const CFG = window.KLIKI_CONFIG, KD = window.KD, KR = window.KR, T = CFG.targets;
  const $ = s => document.querySelector(s);
  const MON = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];
  const MONF = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  const CACHE_KEY = 'kliki-lap-v1'; // asing dari KLIKI Marketing Dashboard (origin sama)
  const TABS = ['ringkasan', 'scorecard', 'lead', 'outlet', 'trend', 'sumber', 'content', 'platform', 'iklan', 'drill', 'dapatan'];
  const TITLES = { ringkasan: 'Ringkasan', scorecard: 'Scorecard KPI Marketing', lead: 'Lead & Walk-in: Company & Q4', outlet: 'Lead & Walk-in: Outlet', trend: 'Trend: View ke Walk-in', sumber: 'Sumber: Klik ke Lead ke Walk-in', content: 'Content', platform: 'Platform & Traffic', iklan: 'Iklan berbayar', drill: 'Outlet', dapatan: 'Dapatan' };
  const SRC = {
    ringkasan: 'REPORT CONTENT DATA, CONTENT SUBMIT, Lead Walk-in Mirror, Kliki Marketing Brief',
    scorecard: 'REPORT CONTENT DATA, CONTENT SUBMIT, Lead Walk-in Mirror, Kemas Kini KPI Marketing',
    lead: 'KLIKI Lead Walk-in Mirror (masterFRONT), Kliki Marketing Brief Oct-Dec 2026',
    outlet: 'CONTENT SUBMIT, REPORT CONTENT DATA (LINKTREE, panel pemarkahan), Lead Walk-in Mirror',
    trend: 'CONTENT SUBMIT (Tiktok), Lead Walk-in Mirror',
    sumber: 'Linktree (REPORT CONTENT DATA), Tracker Meta Ads & Google Ads (Iklan Mirror), Lead Walk-in Mirror',
    content: 'REPORT CONTENT DATA (tab bulan), CONTENT SUBMIT, Content Schedule',
    platform: 'CONTENT SUBMIT (Tiktok, Facebook, Instagram, Youtube, Threads, Telegram), REPORT CONTENT DATA (LINKTREE)',
    iklan: 'Tracker Meta Ads (CTWA) & Tracker Google Ads (Raxbit) melalui Iklan Mirror, tanpa RM',
    drill: 'Semua sumber, satu outlet', dapatan: 'Dikira dari Scorecard KPI bulan ini',
  };
  const ONAME = { KUL: 'Kulim', AOR: 'Alor Setar', SP: 'Sungai Petani', PDG: 'Pendang', HQ: 'HQ' };

  function localGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function localSet(k, v) { try { localStorage.setItem(k, v); } catch { /* disekat */ } }
  const savedTab = localGet('kliki-lap-tab');
  const state = { ds: null, month: null, picked: false, tab: TABS.includes(savedTab) ? savedTab : 'ringkasan', outlet: localGet('kliki-lap-outlet') || 'AOR', plat: 'tiktok', loading: false };

  // ---------- format ----------
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const N = (n, d = 0) => n == null || !Number.isFinite(n) ? '-' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const P = (n, d = 1) => n == null || !Number.isFinite(n) ? '-' : n.toFixed(d) + '%';
  const short = n => n == null ? '-' : Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1e4 ? Math.round(n / 1e3) + 'K' : N(n);
  const val = r => r.actual == null ? '<span class="mute">-</span>' : r.unit === '%' ? P(r.actual) : N(r.actual);
  const tgt = r => r.target == null ? '<span class="mute">-</span>' : r.floor ? `≥ ${N(r.target)}` : r.unit === '%' ? P(r.target) : N(r.target);
  const LV = { good: 'good', warn: 'warn', bad: 'bad', na: 'na' };
  function pill(r, d = 1) {
    if (!r || r.actual == null || r.target == null) return '<span class="mute">-</span>';
    if (r.floor) return `<span class="pill ${LV[r.level]}">${r.level === 'good' ? 'Capai' : 'Tak capai'}</span>`;
    return `<span class="pill ${LV[r.level]}">${P(r.ach, d)}</span>`;
  }
  function bar(r) {
    if (!r || r.floor || r.ach == null) return '<div class="bar"><i style="width:0"></i></div>';
    const pm = r.partial ? `<b class="pace" style="left:${(Math.min(1, r.pace) * 100).toFixed(1)}%"></b>` : '';
    return `<div class="bar ${r.level}"><i style="width:${Math.max(0, Math.min(100, r.ach)).toFixed(1)}%"></i>${pm}</div>`;
  }
  function gap(r) {
    if (!r || r.gap == null) return '<span class="mute">-</span>';
    const g = r.gap, cls = g >= 0 ? 'pos' : 'neg';
    const t = r.unit === '%' ? `${g >= 0 ? '+' : '-'}${Math.abs(g).toFixed(1)} pt` : `${g >= 0 ? '+' : '-'}${N(Math.abs(g))}`;
    return `<span class="${cls}">${t}</span>`;
  }
  // ▲▼ hijau = baik, merah = buruk (lost follower / lost subscriber / kos: turun = hijau)
  function mom(ch, good) {
    if (!ch) return '<span class="mute">-</span>';
    const up = ch.v >= 0, a = Math.abs(ch.v);
    const t = ch.kind === 'pt' ? `${a.toFixed(2)} pt` : ch.kind === 'abs' ? N(a) : `${a.toFixed(1)}%`;
    const g = good == null ? up : good;
    return `<span class="mom ${g ? 'pos' : 'neg'}">${up ? '▲' : '▼'} ${t}</span>`;
  }
  const momR = r => mom(r.mom, r.momGood);

  // ---------- blok asas ----------
  const sec = (title, note = '') => `<div class="sec-h"><span>${esc(title)}</span>${note ? `<small>${note}</small>` : ''}</div>`;
  const noteP = t => `<p class="note"><b>Nota.</b> ${t}</p>`;
  function stat(label, value, opts = {}) {
    return `<div class="stat ${opts.level ? 'lv-' + opts.level : ''}"><div class="st-top"><span class="lbl">${esc(label)}</span>${opts.pill || ''}</div>
      <div class="num">${value}</div>${opts.bar || ''}${opts.sub ? `<div class="sub">${opts.sub}</div>` : ''}</div>`;
  }
  const table = (cols, rows, opts = {}) => `<div class="tw"><table class="t ${opts.cls || ''}"><thead><tr>${cols.map((c, i) => `<th class="${i ? 'r' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const tr = (cells, cls = '') => `<tr class="${cls}">${cells.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr>`;
  const legend = () => `<div class="legend"><b>ACH</b><span><i class="good"></i>100% ke atas</span><span><i class="warn"></i>80 - 99%</span><span><i class="bad"></i>bawah 80%</span></div>`;

  // ---------- chart SVG ----------
  // Garis bulanan (Jan–Dis): tahun ini gelap, tahun lepas kelabu putus-putus. null = tiada data (garis diputus).
  // Lebar chart ikut lajur sebenar supaya saiz teks paksi kekal sama (cols = bilangan lajur grid)
  function chartW(cols = 1) {
    const vw = Math.min(($('#view').clientWidth || innerWidth) - 40, 1160);
    if (innerWidth <= 640) cols = 1; else if (innerWidth <= 900) cols = Math.min(cols, 2);
    return Math.max(280, Math.round((vw - 18 * (cols - 1)) / cols - 30));
  }
  function lineChart(series, opts = {}) {
    const W = opts.w || chartW(opts.cols), H = opts.h || 200, pl = 48, pr = 12, pt = 14, pb = 24, n = 12;
    const all = series.flatMap(s => s.values).filter(v => v != null);
    if (!all.length) return `<div class="empty">Tiada data</div>`;
    let max = Math.max(...all, opts.target || 0) * 1.08, min = Math.min(0, ...all);
    if (max <= min) max = min + 1;
    const x = i => pl + (W - pl - pr) * i / (n - 1), y = v => pt + (H - pt - pb) * (max - v) / (max - min);
    const tl = v => opts.pct ? Math.round(v) + '%' : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e4 ? Math.round(v / 1e3) + 'K' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '')}">`;
    for (let k = 0; k <= 4; k++) { const t = min + (max - min) * k / 4; s += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 6}" y="${y(t) + 3.5}" text-anchor="end">${tl(t)}</text>`; }
    if (min < 0) s += `<line class="gl zero" x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}"/>`;
    if (opts.target) s += `<line class="tl" x1="${pl}" x2="${W - pr}" y1="${y(opts.target)}" y2="${y(opts.target)}"/>`;
    for (let i = 0; i < n; i++) s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle"${i + 1 === opts.hl ? ' class="hlx"' : ''}>${MON[i]}</text>`;
    series.forEach((se, si) => {
      let d = '', on = false;
      se.values.forEach((v, i) => { if (v == null) { on = false; return; } d += `${on ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; on = true; });
      s += `<path class="ln s${si}" d="${d}"/>`;
      se.values.forEach((v, i) => { if (v != null) s += `<circle class="dot s${si}${i + 1 === opts.hl && si === 0 ? ' hl' : ''}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i + 1 === opts.hl && si === 0 ? 4.5 : 2.6}"/>`; });
    });
    const bw = (W - pl - pr) / (n - 1);
    for (let i = 0; i < n; i++) s += `<rect class="hit" x="${(x(i) - bw / 2).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${H - pt - pb}" data-tip="${esc(MON[i] + ': ' + series.map(se => `${se.name} ${se.values[i] == null ? '-' : opts.pct ? P(se.values[i]) : N(se.values[i])}`).join(' · '))}"/>`;
    return s + '</svg>' + `<div class="ckey">${series.map((se, si) => `<span><i class="s${si}"></i>${esc(se.name)}</span>`).join('')}${opts.target ? '<span><i class="tgt"></i>Sasaran</span>' : ''}</div>`;
  }
  // Bar mendatar ach (0–200%) dengan garis 100%
  function achChart(rows) {
    const W = chartW(), lw = 120, H = rows.length * 18 + 22, mx = 200, x = v => lw + (W - lw - 40) * Math.min(v, mx) / mx;
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Achievement lawan target">`;
    for (const t of [0, 50, 100, 150, 200]) s += `<line class="${t === 100 ? 'tl' : 'gl'}" x1="${x(t)}" x2="${x(t)}" y1="2" y2="${H - 18}"/><text x="${x(t)}" y="${H - 5}" text-anchor="middle">${t}%</text>`;
    rows.forEach((r, i) => {
      const yy = 4 + i * 18, a = r.ach || 0;
      s += `<text x="${lw - 8}" y="${yy + 10}" text-anchor="end" class="lbl">${esc(r.label)}</text><rect class="ab ${r.level}" x="${lw}" y="${yy}" width="${Math.max(1.5, x(a) - lw).toFixed(1)}" height="13"/><text x="${(x(a) + 5).toFixed(1)}" y="${yy + 10}" class="v">${Math.round(a)}%</text>`;
    });
    return s + '</svg>';
  }
  // Bar berkumpulan ringkas (cth trend 4 bulan sumber, iklan 6 bulan)
  function barChart(labels, series, opts = {}) {
    const W = chartW(opts.cols), H = opts.h || 180, pl = 48, pr = 8, pt = 12, pb = 24;
    const all = series.flatMap(s => s.values).filter(v => v != null);
    if (!all.length) return `<div class="empty">Tiada data</div>`;
    const max = Math.max(...all) * 1.1 || 1, y = v => pt + (H - pt - pb) * (max - v) / max;
    const gw = (W - pl - pr) / labels.length, bw = Math.min(28, (gw - 10) / series.length);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '')}">`;
    for (let k = 0; k <= 3; k++) { const t = max * k / 3; s += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 6}" y="${y(t) + 3.5}" text-anchor="end">${short(t)}</text>`; }
    labels.forEach((l, i) => {
      const gx = pl + gw * i + (gw - bw * series.length) / 2;
      series.forEach((se, si) => { const v = se.values[i]; if (v == null) return; s += `<rect class="bb s${si}" x="${(gx + si * bw).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${(H - pb - y(v)).toFixed(1)}" data-tip="${esc(`${l} · ${se.name}: ${N(v)}`)}"/>`; });
      s += `<text x="${(pl + gw * i + gw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
    });
    return s + '</svg>' + `<div class="ckey">${series.map((se, si) => `<span><i class="bs${si}"></i>${esc(se.name)}</span>`).join('')}</div>`;
  }

  const tip = $('#tip');
  function showTip(e) {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    const r = t.getBoundingClientRect();
    tip.textContent = t.dataset.tip; tip.hidden = false;
    tip.style.left = Math.min(Math.max(r.left + r.width / 2, 110), innerWidth - 110) + 'px'; tip.style.top = r.top + 'px';
  }
  document.addEventListener('pointerover', showTip);
  document.addEventListener('pointerdown', showTip);
  document.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  // ---------- data bulan ----------
  const parseKey = key => key.split('-').map(Number);
  const monLabel = (y, m) => `${MONF[m - 1]} ${y}`;
  async function monthData(key) {
    const [y, m] = parseKey(key), [py, pm] = KD.prevYM(y, m), ds = state.ds;
    const [Pm, PPm] = await Promise.all([KD.loadMonthPosts(ds, y, m), KD.loadMonthPosts(ds, py, pm)]);
    const c = Pm.posts.length ? KD.contentStats(Pm.posts) : null, pc = PPm.posts.length ? KD.contentStats(PPm.posts) : null;
    return { y, m, py, pm, P: Pm, c, pc, sc: KR.scorecard(ds, y, m, c, pc) };
  }
  function periodNote(y, m) {
    if (!KR.isLive(y, m)) return `1 - ${KD.daysIn(y, m)} ${MON[m - 1]} ${y}`;
    const lc = KR.leadCompany(state.ds, y, m);
    return `Bulan berjalan: data lead sehingga ${lc.lastDay || '-'} ${MON[m - 1]}. Warna ikut kadar hari operasi.`;
  }
  const head = (y, m, sub) => `<div class="page-h"><div><h2>${monLabel(y, m)}</h2><p>${sub || periodNote(y, m)}</p></div>${legend()}</div>`;

  // ================= 1. RINGKASAN =================
  async function vRingkasan(key) {
    const d = await monthData(key), { y, m, sc } = d, lc = KR.leadCompany(state.ds, y, m), f = KR.findings(sc);
    const R = id => sc.rows.find(r => r.id === id);
    let h = head(y, m);
    h += `<div class="grid3">${stat('KPI capai (≥100%)', `${sc.good} / ${sc.total}`, { level: 'good', sub: 'hijau' })}${stat('Hampir (80 - 99%)', `${sc.warn} / ${sc.total}`, { level: 'warn', sub: 'kuning' })}${stat('Bawah 80%', `${sc.bad} / ${sc.total}`, { level: 'bad', sub: sc.na ? `merah · ${sc.na} tiada data` : 'merah' })}</div>`;
    h += `<div class="grp-line">${sc.groups.map(g => `<span>${esc(g.title.replace(/^\d+\.\s*/, ''))} <b>${g.rows.filter(r => r.level === 'good').length}/${g.rows.length}</b></span>`).join('')}</div>`;
    h += sec('Lead & Walk-in bulan ini', 'Phone + Repair + CC, 4 outlet');
    const lead = R('leads'), walk = R('walkin'), conv = R('conversion');
    h += `<div class="grid3">${stat('WhatsApp lead', N(lead.actual), { level: lead.level, pill: pill(lead), bar: bar(lead), sub: `Plan <b>${N(lead.target)}</b> · ${gap(lead)}` })}
      ${stat('Walk-in', N(walk.actual), { level: walk.level, pill: pill(walk), bar: bar(walk), sub: `Plan <b>${N(walk.target)}</b> · ${gap(walk)}` })}
      ${stat('Conversion (walk-in ÷ lead)', P(conv.actual), { level: conv.level, pill: pill(conv), sub: `Target <b>40%</b> · ${MON[d.pm - 1]} ${P(lc.convPrev)} · ${MON[m - 1]} ${y - 1} ${P(lc.convLY)}` })}</div>`;
    const Y = lc.ytd;
    if (Y.cur) {
      h += sec(`Year to Month: Jan - ${MON[m - 1]} ${y}`, `lawan Jan - ${MON[m - 1]} ${y - 1}`);
      h += `<div class="grid3">${stat('Lead YTD', N(Y.cur.lead), { sub: `${y - 1}: ${Y.ly ? N(Y.ly.lead) : '-'} · ${mom(Y.leadCh)}` })}${stat('Walk-in YTD', N(Y.cur.walkin), { sub: `${y - 1}: ${Y.ly ? N(Y.ly.walkin) : '-'} · ${mom(Y.walkCh)}` })}${stat('Conversion YTD', P(Y.cur.conv), { sub: `${y - 1}: ${Y.ly ? P(Y.ly.conv) : '-'} · ${mom(Y.convCh)}` })}</div>`;
    }
    if (lc.quarter) {
      const q = lc.quarter;
      h += sec(`Kemajuan Plan Q${q.q} ${y}`, 'Plan: Kliki Marketing Brief (Sales)');
      h += `<div class="grid2">${stat('Lead kumulatif', `${N(q.cumLead)} <small>/ ${N(q.fullLead)}</small>`, { bar: `<div class="bar plain"><i style="width:${Math.min(100, q.pctLead).toFixed(1)}%"></i></div>`, sub: `${P(q.pctLead)} daripada Plan penuh Q${q.q}` })}${stat('Walk-in kumulatif', `${N(q.cumWalk)} <small>/ ${N(q.fullWalk)}</small>`, { bar: `<div class="bar plain"><i style="width:${Math.min(100, q.pctWalk).toFixed(1)}%"></i></div>`, sub: `${P(q.pctWalk)} daripada Plan penuh Q${q.q}` })}</div>`;
    }
    h += sec('Content & view bulan ini');
    const tc = R('totalContent'), pv = R('postViews'), tv = R('ttViews'), av = R('allViews');
    h += `<div class="grid4">${[[tc, 'Total content'], [pv, 'Views per post'], [tv, 'Views akaun TikTok'], [av, 'Total view semua platform']].map(([r, l]) => stat(l, r.actual == null ? '-' : r.id === 'totalContent' ? N(r.actual) : short(r.actual), { level: r.level, pill: pill(r), bar: bar(r), sub: `Target ${short(r.target)} · ${momR(r)} vs ${MON[d.pm - 1]}` })).join('')}</div>`;
    h += sec('Dapatan automatik', 'butiran di tab Dapatan');
    h += findingsList(f);
    h += noteP('Kiraan KPI ikut Peta Sumber Data seksyen 6 (sasaran berkuat kuasa report Sept 2026). Lead & Walk-in ikut Plan Sales; HQ dan Others tidak masuk Total. Bahagian Lead/Walk-in tidak dicampur dengan content atau view.');
    return h;
  }
  function findingsList(f) {
    const li = (r, kind) => `<li class="${kind}"><b>${esc(r.label)}</b> ${r.unit === '%' ? P(r.actual) : N(r.actual)} lawan target ${r.unit === '%' ? P(r.target) : N(r.target)} (${P(r.ach)})${r.mom ? ` · ${momR(r)} vs bulan lepas` : ''}</li>`;
    return `<div class="find"><div><h4>Paling jauh dari target</h4><ul>${f.worst.map(r => li(r, 'bad')).join('') || '<li class="mute">-</li>'}</ul></div>
      <div><h4>Paling tinggi capai</h4><ul>${f.best.map(r => li(r, 'good')).join('') || '<li class="mute">Tiada KPI capai</li>'}</ul></div></div>`;
  }

  // ================= 2. SCORECARD =================
  async function vScorecard(key) {
    const d = await monthData(key), { y, m, sc, pm } = d;
    let h = head(y, m);
    h += `<div class="grid3">${stat('KPI capai (≥100%)', `${sc.good} / ${sc.total}`, { level: 'good' })}${stat('Hampir (80 - 99%)', `${sc.warn} / ${sc.total}`, { level: 'warn' })}${stat('Bawah 80%', `${sc.bad} / ${sc.total}`, { level: 'bad' })}</div>`;
    h += sec(`Scorecard KPI Marketing, ${monLabel(y, m)}`, 'Sasaran berkuat kuasa report Sept 2026 · kaji semula Jan 2027');
    const rows = [];
    for (const g of sc.groups) {
      rows.push(`<tr class="grp"><td colspan="7">${esc(g.title)}</td></tr>`);
      for (const r of g.rows) rows.push(tr([esc(r.label) + (r.partial ? ' <span class="live" title="Bulan berjalan: ikut kadar hari">●</span>' : ''), tgt(r), val(r), pill(r), bar(r), gap(r), momR(r)]));
    }
    h += table(['KPI', 'Target', 'Actual', 'Achievement', '', 'Gap', 'vs ' + MON[pm - 1]], rows, { cls: 'score' });
    h += sec('Achievement lawan target', 'Net Followers tidak termasuk (sasaran minimum)');
    h += achChart(sc.rows.filter(r => !r.floor && r.ach != null));
    h += noteP('Views per post = video yang diposting bulan ini. Views akaun dan total semua platform termasuk video lama. Bucket kategori tidak dijumlahkan (iPhone/Android tidak termasuk kategori Repair; Trade-in / C&C = Trade-in + Buyback). Unique Linktree = Linktree unique view. CTR Profile → Linktree = Linktree view ÷ TikTok profile visit (Tiktok Insight). Net Followers ialah sasaran minimum. Leads & Walk-in ikut Plan Sales.');
    return h;
  }

  // ================= 3. LEAD COMPANY & Q4 =================
  function vLead(key) {
    const [y, m] = parseKey(key), lc = KR.leadCompany(state.ds, y, m), [py, pm] = KD.prevYM(y, m);
    const tot = lc.rows.find(r => r.id === 'total');
    let h = head(y, m, lc.plan ? `${periodNote(y, m)} · vs Plan ${MON[m - 1]} (Kliki Marketing Brief)` : `${periodNote(y, m)} · Plan bulan ini belum ditetapkan`);
    h += `<div class="grid3">${stat('WhatsApp lead', N(tot.lead.actual), { level: tot.lead.level, pill: pill(tot.lead), bar: bar(tot.lead), sub: `Plan <b>${N(tot.lead.target)}</b> · ${tot.lead.gap != null ? (tot.lead.gap < 0 ? `<span class="neg">Deficit ${N(-tot.lead.gap)}</span>` : `<span class="pos">Lebih ${N(tot.lead.gap)}</span>`) : ''}` })}
      ${stat('Walk-in', N(tot.walkin.actual), { level: tot.walkin.level, pill: pill(tot.walkin), bar: bar(tot.walkin), sub: `Plan <b>${N(tot.walkin.target)}</b> · ${tot.walkin.gap != null ? (tot.walkin.gap < 0 ? `<span class="neg">Deficit ${N(-tot.walkin.gap)}</span>` : `<span class="pos">Lebih ${N(tot.walkin.gap)}</span>`) : ''}` })}
      ${stat('Conversion (walk-in ÷ lead)', P(lc.conversion.actual), { level: lc.conversion.level, pill: pill(lc.conversion), sub: `Target <b>40%</b> · ${gap(lc.conversion)}<br>${MON[pm - 1]} ${P(lc.convPrev)} · ${MON[m - 1]} ${y - 1} ${P(lc.convLY)}` })}</div>`;
    h += sec(`Lead dan Walk-in Company, ${monLabel(y, m)}`, `Actual vs Plan ${MON[m - 1]}`);
    h += table(['Kategori', 'Lead actual', 'Plan', 'Ach', 'Walk-in actual', 'Plan', 'Ach', 'Lead-to-walk-in'],
      lc.rows.map(r => tr([r.label, N(r.lead.actual), N(r.lead.target), pill(r.lead, 0), N(r.walkin.actual), N(r.walkin.target), pill(r.walkin, 0), P(r.l2w)], r.id === 'total' ? 'tot' : '')));
    if (lc.quarter) {
      const q = lc.quarter;
      h += sec(`Kumulatif Q${q.q} ${y}: Actual vs Plan`, 'Plan: Kliki Marketing Brief');
      const rows = q.rows.map(r => r.done
        ? tr([MON[r.m - 1], N(r.lead), N(r.planLead), pill(r.ach, 0), N(r.cumLead), N(r.cumPlanLead), pill(r.cumAch, 0), N(r.walkin), N(r.planWalk), pill(r.achW, 0), N(r.cumWalk), N(r.cumPlanWalk), pill(r.cumAchW, 0)])
        : tr([MON[r.m - 1], '-', N(r.planLead), '-', '-', '-', '-', '-', N(r.planWalk), '-', '-', '-', '-']));
      rows.push(tr([`Plan penuh Q${q.q}`, '', N(q.fullLead), '', N(q.cumLead), N(q.fullLead), `<b>${P(q.pctLead)}</b>`, '', N(q.fullWalk), '', N(q.cumWalk), N(q.fullWalk), `<b>${P(q.pctWalk)}</b>`], 'tot'));
      h += table(['Bulan', 'Lead', 'Plan', 'Ach', 'Kum. lead', 'Kum. plan', 'Kum. ach', 'Walk-in', 'Plan', 'Ach', 'Kum. walk-in', 'Kum. plan', 'Kum. ach'], rows, { cls: 'dense' });
    }
    h += sec('Segmen berasingan');
    const sg = lc.segments;
    h += table(['Segmen (tidak dicampur dalam Total)', 'Lead', 'Walk-in', 'Plan'], [
      tr(['HQ Online Postage', N(sg.hqOnline), '-', '-']), tr(['HQ Buyback', N(sg.hqBuyback), '-', '-']), tr(['Others (outlet, luar Phone / Repair / CC)', N(sg.othersLead), N(sg.othersWalk), '-'])]);
    h += noteP('Baris Plan penuh: peratus Plan suku tahun yang sudah dicapai setakat bulan ini (tanpa warna kerana suku tahun belum tamat). Lead dan walk-in dikira pada Phone, Repair dan CC sahaja, jumlah 4 outlet. Lead-to-Walk-in = Walk-in ÷ Lead (tidak diwarnakan); Repair boleh melebihi 100% kerana ramai pelanggan repair walk-in terus tanpa WhatsApp. Content dan platform di tab lain.');
    return h;
  }

  // ================= 4. OUTLET =================
  async function vOutlet(key) {
    const d = await monthData(key), { y, m } = d, ok = KR.outletKpi(state.ds, y, m, d.P.googleReview), lo = KR.leadOutlets(state.ds, y, m);
    let h = head(y, m);
    h += sec(`KPI Outlet, ${monLabel(y, m)}`, 'Format: actual / target · achievement');
    h += `<div class="grid4">${KR.OUT.map(x => `<button class="stat oc" data-outlet="${x}"><div class="st-top"><span class="lbl">${ONAME[x].toUpperCase()}</span></div><div class="num">${ok.score[x].hit} / ${ok.score[x].of}</div><div class="sub">KPI capai · ketik untuk butiran</div></button>`).join('')}</div>`;
    const cell = c => c.na ? '<span class="mute">N/A</span>' : c.actual == null ? '<span class="mute">-</span>' : `${c.unit === '%' ? P(c.actual) : `${N(c.actual)}/${N(c.target)}`} ${pill(c, 0)}`;
    h += table(['KPI', ...KR.OUT.map(x => ONAME[x]), 'Total'], ok.rows.map(r => tr([r.label, ...KR.OUT.map(x => cell(r.cells[x])), r.total ? cell(r.total) : '<span class="mute">-</span>'])), { cls: 'dense' });
    h += noteP('Sasaran setiap outlet: RAW Phone 4, RAW Repair 2, Customer Image 52, Before/After 26, Google Review 30 (kumulatif, dari panel pemarkahan tab bulan), WhatsApp 1,500 dan Location 300 (klik Linktree), Conversion 40%. Pendang tiada repair: RAW Repair dan Before/After = N/A. Leads dan Walk-in ikut Plan Sales. Kulim = Kelang Lama.');
    h += sec('Perbandingan outlet: Lead dan Walk-in ikut kategori', 'Actual vs Plan');
    for (const o of lo) {
      h += `<h3 class="sub-h">${ONAME[o.x]}</h3>`;
      h += table(['Kategori', 'Lead', 'Plan', 'Ach', 'Walk-in', 'Plan', 'Ach', 'Lead-to-walk-in'], o.rows.map(r => r.na
        ? tr([r.label, '<span class="mute">N/A</span>', '', '', '', '', '', ''])
        : tr([r.label, N(r.lead.actual), N(r.lead.target), pill(r.lead, 0), N(r.walkin.actual), N(r.walkin.target), pill(r.walkin, 0), P(r.l2w)], r.id === 'total' ? 'tot' : '')));
    }
    return h;
  }

  // ================= 5. TREND =================
  function vTrend(key) {
    const [y, m] = parseKey(key), M = KR.monthly(state.ds, y);
    const S = (f, lyF = f) => [{ name: String(y), values: M.cur.map(f) }, { name: String(y - 1), values: M.ly.map(lyF) }];
    const cut = arr => arr.map((v, i) => i + 1 > m ? null : v);
    let h = head(y, m, `Bulanan ${y} lawan ${y - 1}`);
    h += sec('Trend: View ke Walk-in', 'Bahagian lead/walk-in tidak dicampur dengan view');
    h += `<div class="grid2">
      <div class="card"><h4>Views akaun TikTok</h4>${lineChart(S(r => r.ttViews).map((s, i) => i ? s : { ...s, values: cut(s.values) }), { hl: m, cols: 2, target: T.tiktokViews, aria: 'Views TikTok bulanan' })}</div>
      <div class="card"><h4>Lead (Phone + Repair + CC)</h4>${lineChart(S(r => r.lead).map((s, i) => i ? s : { ...s, values: cut(s.values) }), { hl: m, cols: 2, aria: 'Lead bulanan' })}</div>
      <div class="card"><h4>Walk-in</h4>${lineChart(S(r => r.walkin).map((s, i) => i ? s : { ...s, values: cut(s.values) }), { hl: m, cols: 2, aria: 'Walk-in bulanan' })}</div>
      <div class="card"><h4>Conversion (walk-in ÷ lead)</h4>${lineChart(S(r => r.conv).map((s, i) => i ? s : { ...s, values: cut(s.values) }), { hl: m, cols: 2, pct: true, target: T.conversion, aria: 'Conversion bulanan' })}</div></div>`;
    h += sec('Trend ikut kategori', 'Lead / walk-in');
    h += `<div class="grid3">${KR.CATS.map(c => `<div class="card"><h4>${KR.CAT_LABEL[c]}</h4>${lineChart([{ name: 'Lead ' + y, values: cut(M.cur.map(r => r.cat[c].lead)) }, { name: 'Walk-in ' + y, values: cut(M.cur.map(r => r.cat[c].walkin)) }, { name: 'Lead ' + (y - 1), values: M.ly.map(r => r.cat[c].lead) }], { hl: m, h: 170, cols: 3, aria: KR.CAT_LABEL[c] })}</div>`).join('')}</div>`;
    h += sec('Perbandingan outlet: Trend', 'Lead / walk-in ' + y);
    h += `<div class="grid2">${KR.OUT.map(x => `<div class="card"><h4>${ONAME[x]}</h4>${lineChart([{ name: 'Lead', values: cut(M.cur.map(r => r.outlet[x].lead)) }, { name: 'Walk-in', values: cut(M.cur.map(r => r.outlet[x].walkin)) }, { name: 'Lead ' + (y - 1), values: M.ly.map(r => r.outlet[x].lead) }], { hl: m, h: 170, cols: 2, aria: ONAME[x] })}</div>`).join('')}</div>`;
    const rows = M.cur.slice(0, m).map((r, i) => { const l = M.ly[i]; return tr([MON[i], N(r.ttViews), N(l.ttViews), N(r.lead), N(l.lead), N(r.walkin), N(l.walkin), P(r.conv), P(l.conv)], i + 1 === m ? 'hl' : ''); });
    h += sec('Jadual bulanan');
    h += table(['Bulan', `View TikTok ${y}`, String(y - 1), `Lead ${y}`, String(y - 1), `Walk-in ${y}`, String(y - 1), `Conv. ${y}`, String(y - 1)], rows, { cls: 'dense' });
    return h;
  }

  // ================= 6. SUMBER =================
  function vSumber(key) {
    const [y, m] = parseKey(key), s = KR.sources(state.ds, y, m), [py, pm] = KD.prevYM(y, m), t = s.total;
    let h = head(y, m);
    if (!s.adsLoaded || !s.hasMeta || !s.hasGoogle) h += `<div class="warn-box">${!s.adsLoaded ? 'Sheet Iklan Mirror belum boleh dibaca (buka sheet dan klik "Allow access" untuk IMPORTRANGE).' : `Data ${!s.hasMeta ? 'Meta Ads' : ''}${!s.hasMeta && !s.hasGoogle ? ' dan ' : ''}${!s.hasGoogle ? 'Google Ads/GBP' : ''} bulan ini belum ada dalam tracker.`} Angka di bawah hanya dari sumber yang ada.</div>`;
    h += sec(`Dari Klik ke Lead ke Walk-in, ${monLabel(y, m)}`, 'Semua sumber: Linktree, Meta Ads, Google');
    h += `<div class="flow">${stat('Klik ke WhatsApp outlet', N(t.wa), { sub: `Linktree ${N(t.ltWa)} · Meta ${N(t.meta)} · GBP chat ${N(t.gbp)}` })}<div class="arrow"><b>${P(t.leadPerClick)}</b>→<small>jadi lead</small></div>
      ${stat('WhatsApp lead', N(t.lead), { sub: 'Phone + Repair + CC, 4 outlet' })}<div class="arrow"><b>${P(t.l2w)}</b>→<small>datang</small></div>
      ${stat('Walk-in', N(t.walk), { level: 'good', sub: `${P(t.walkPerClick)} daripada klik WhatsApp` })}</div>`;
    h += `<div class="grid4">${stat('Call ke outlet', N(t.call), { sub: 'Google Ads call click + GBP call' })}${stat('Klik arah ke outlet', N(t.dir), { sub: 'Google Ads + GBP + Linktree lokasi' })}${stat('Semua tindakan hubungi / datang', N(t.all), { sub: 'WhatsApp + call + arah' })}${stat('Walk-in ÷ semua tindakan', P(t.walkPerAll), { sub: `${N(t.walk)} ÷ ${N(t.all)}` })}</div>`;
    h += sec('Tindakan ikut sumber', `${MON[m - 1]} lawan ${MON[pm - 1]}`);
    h += table(['Sumber', MON[m - 1], MON[pm - 1], 'MoM', 'Jenis', 'Data dari'], s.lines.map(l => tr([l.total ? `<b>${esc(l.label)}</b>` : esc(l.label), l.total ? `<b>${N(l.v)}</b>` : N(l.v), N(l.prev), mom(l.mom), l.type || '', l.src || ''], l.total ? 'tot' : '')));
    h += sec(`Ikut outlet, ${monLabel(y, m)}`, 'Klik WhatsApp = Linktree + Meta + GBP chat');
    const rows = KR.OUT.map(x => { const p = s.per[x]; return tr([ONAME[x], N(p.ltWa), N(p.meta), N(p.gbp), N(p.wa), N(p.lead), N(p.walk), P(p.leadPerClick), N(p.call), N(p.dir), P(p.walkPerAll)]); });
    rows.push(tr(['Total', N(t.ltWa), N(t.meta), N(t.gbp), N(t.wa), N(t.lead), N(t.walk), P(t.leadPerClick), N(t.call), N(t.dir), P(t.walkPerAll)], 'tot'));
    h += table(['Outlet', 'Linktree', 'Meta', 'GBP chat', 'Klik WA', 'Lead', 'Walk-in', 'Lead ÷ klik', 'Call', 'Arah', 'Walk-in ÷ semua'], rows, { cls: 'dense' });
    h += sec('Trend 4 bulan', '4 outlet');
    h += table(['Bulan', 'Linktree', 'Meta', 'GBP chat', 'Klik WA', 'Lead', 'Walk-in', 'Lead ÷ klik', 'Walk-in ÷ klik'], s.trend.map(r => tr([MON[r.m - 1], N(r.ltWa), N(r.meta), N(r.gbp), N(r.wa), N(r.lead), N(r.walk), P(r.leadPerClick), P(r.walkPerClick)])));
    h += noteP('Lead belum ditanda ikut sumber, jadi kadar dikira pada jumlah semua sumber, bukan setiap sumber. Meta Ads mula Okt 2026 (fasa uji). GBP (Google Business Profile) termasuk carian organik. Call dan arah tidak dikira dalam WhatsApp lead tetapi menyumbang walk-in. TikTok website click ialah klik ke Linktree, tidak dicampur untuk elak kiraan berganda.');
    return h;
  }

  // ================= 7. CONTENT =================
  async function vContent(key) {
    const d = await monthData(key), { y, m, sc, pm, P: Pm, c } = d;
    let h = head(y, m, `${periodNote(y, m)} · tab ${esc(Pm.tab || '-')}`);
    if (!c) return h + `<div class="warn-box">Tab per-post ${MON[m - 1]} belum dijumpai dalam REPORT CONTENT DATA (${esc(Pm.error || '')}).</div>`;
    const ct = KR.content(Pm.posts, c);
    h += sec(`Content Output dan Mix, ${monLabel(y, m)}`, `Strategic = semua post selain POV Customer (HQ ${ct.strategicSource.hq}, outlet ${ct.strategicSource.outlet})`);
    const rows = [];
    for (const g of sc.groups.slice(0, 3)) {
      rows.push(`<tr class="grp"><td colspan="6">${esc(g.title)}</td></tr>`);
      for (const r of g.rows) rows.push(tr([`<b>${esc(r.label)}</b>`, tgt(r), val(r), pill(r), gap(r), `${r.prev == null ? '-' : N(r.prev)} ${momR(r)}`]));
    }
    h += table(['KPI', 'Target', 'Actual', 'Achievement', 'Gap', `${MON[pm - 1]} (MoM)`], rows);
    h += sec('Achievement lawan target');
    h += achChart(sc.groups.slice(0, 3).flatMap(g => g.rows).filter(r => r.ach != null));
    h += sec('Ikut Funnel', 'TOFU = Educational + Trend · MOFU = POV Customer + Review · BOFU = Promo');
    const fbar = k => `<div class="fbar"><span>${k === 'pctPosts' ? '% Post' : '% View'}</span><div>${ct.funnel.map((f, i) => `<i class="f${i}" style="width:${(f[k] || 0).toFixed(2)}%">${(f[k] || 0) >= 12 ? `${f.k} ${P(f[k])}` : ''}</i>`).join('')}</div></div>`;
    h += fbar('pctPosts') + fbar('pctViews');
    h += table(['Funnel', 'Post', '% post', 'View', 'Purata view', '% view'], [...ct.funnel.map(f => tr([f.k, N(f.posts), P(f.pctPosts), N(f.views), N(f.avg), P(f.pctViews)])), tr(['Total', N(ct.total), '100.0%', N(ct.views), N(ct.avg), '100.0%'], 'tot')]);
    // Content View (halaman 12)
    h += sec(`Content View, ${monLabel(y, m)}`, 'View TikTok video yang diposting bulan ini');
    const pv = sc.rows.find(r => r.id === 'postViews');
    h += `<div class="grid4">${stat('Total view post', N(ct.views), { level: pv.level, pill: pill(pv), bar: bar(pv), sub: `Target ${N(pv.target)}` })}${stat('Purata', N(ct.avg), { sub: 'view / post' })}${stat('Median', N(ct.median), { sub: 'view / post' })}${stat('Silver ke atas', `${N(ct.tiers.slice(0, 3).reduce((a, t) => a + t.n, 0))} / ${N(ct.total)}`, { sub: '≥ 100k view' })}</div>`;
    const grpT = (title, arr) => `<div class="card"><h4>${title}</h4>${table([title.split(' ')[1] || 'Kumpulan', 'Post', 'View', 'Purata', '% view'], arr.map(g => tr([esc(g.k), N(g.posts), N(g.views), N(g.avg), P(g.pctViews)])), { cls: 'dense' })}</div>`;
    h += `<div class="grid2">${grpT('Ikut Kategori', ct.byKategori)}${grpT('Ikut Type', ct.byType)}</div>`;
    h += `<div class="grid2"><div class="card"><h4>Tier</h4>${table(['Tier', 'Post'], ct.tiers.map(t => tr([t.t + (t.t === 'Diamond' ? ' (≥1M)' : t.t === 'Gold' ? ' (≥300k)' : t.t === 'Silver' ? ' (≥100k)' : ' (<100k)'), N(t.n)])), { cls: 'dense' })}</div>${grpT('Ikut Sub kategori', ct.bySub)}</div>`;
    const postRow = (p, i) => tr([String(i + 1), `${String(p.date ? p.date.d : '').padStart(2, '0')}/${String(m).padStart(2, '0')}`, ONAME[p.outlet] || esc(p.outlet), esc(p.kategori), esc(p.type), esc(p.sub), p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${N(p.views)}</a>` : N(p.views)]);
    h += sec('Top 10 content');
    h += table(['#', 'Tarikh', 'Outlet', 'Kategori', 'Type', 'Sub', 'View'], ct.top.map(postRow), { cls: 'dense' });
    h += sec('5 view terendah');
    h += table(['#', 'Tarikh', 'Outlet', 'Kategori', 'Type', 'Sub', 'View'], ct.bottom.map(postRow), { cls: 'dense' });
    // Content & supply outlet (halaman 13)
    const ok = KR.outletKpi(state.ds, y, m, Pm.googleReview);
    h += sec('Perbandingan outlet: Content dan Supply');
    const byO = Object.fromEntries(ct.byOutlet.map(g => [g.k, g]));
    h += table(['Outlet', 'Post', 'View', 'Purata', '% view', 'RAW Phone', 'RAW Repair', 'Customer', 'Before/After'], [...KR.OUT, 'HQ'].map(x => {
      const g = byO[x] || { posts: 0, views: 0, avg: null, pctViews: 0 }, cell = k => { const r = ok.rows.find(q => q.k === k); if (!r || !r.cells[x]) return '<span class="mute">-</span>'; const cc = r.cells[x]; return cc.na ? '<span class="mute">N/A</span>' : `${N(cc.actual)}/${N(cc.target)} ${pill(cc, 0)}`; };
      return tr([ONAME[x] || x, N(g.posts), N(g.views), N(g.avg), P(g.pctViews), cell('rawPhone'), cell('rawRepair'), cell('customer'), cell('beforeAfter')]);
    }), { cls: 'dense' });
    h += noteP('Target content sama setiap bulan (Content Schedule): 50 post, POV Customer 25, Strategic 25. Subject Strategic ikut KATEGORI. Funnel ikut TYPE (bukan lajur FUNNEL sheet).');
    return h;
  }

  // ================= 8. PLATFORM =================
  function vPlatform(key) {
    const [y, m] = parseKey(key), p = KR.platform(state.ds, y, m), [py, pm] = KD.prevYM(y, m);
    let h = head(y, m);
    h += sec(`Prestasi Platform, ${monLabel(y, m)}`, `${MON[m - 1]} lawan ${MON[pm - 1]}`);
    const pt = (name, o) => `<div class="card"><h4>${name} <small>${o.days}/${p.dim} hari data</small></h4>${table(['Metrik', MON[pm - 1], MON[m - 1], 'MoM'], o.rows.map(r => tr([esc(r.label) + (r.days != null && r.actual != null && r.days < p.dim ? ` <small class="mute">(${r.days} hari)</small>` : ''), r.unit === '%' ? P(r.prev, 2) : N(r.prev), r.unit === '%' ? P(r.actual, 2) : N(r.actual), mom(r.mom, r.momGood)])), { cls: 'dense' })}</div>`;
    h += `<div class="grid2">${pt('TikTok', p.tiktok)}${pt('YouTube', p.youtube)}${pt('Facebook', p.facebook)}${pt('Instagram', p.instagram)}${p.threads.days ? pt('Threads', p.threads) : ''}${p.telegram.days ? pt('Telegram', p.telegram) : ''}</div>`;
    const av = p.allViews;
    h += `<div class="card"><div class="st-top"><span class="lbl">TOTAL VIEW SEMUA PLATFORM</span>${pill(av)}</div><div class="num big">${N(av.actual)} <small>sasaran ${N(av.target)} · vs ${MON[pm - 1]} ${momR(av)}</small></div>
      <div class="share">${p.share.map((s, i) => `<i class="p${i}" style="width:${(s.pct || 0).toFixed(2)}%"></i>`).join('')}</div><div class="ckey">${p.share.map((s, i) => `<span><i class="p${i}"></i>${s.name} <b>${P(s.pct)}</b></span>`).join('')}</div></div>`;
    const L = p.linktree;
    h += sec('Traffic: TikTok ke Linktree', 'Warna ikut sasaran KPI');
    h += `<div class="flow">${stat('TikTok profile visit', N(L.profile.actual), { level: L.profile.level, pill: pill(L.profile, 0), sub: `${MON[pm - 1]} ${N(L.profile.prev)} · sasaran ${N(L.profile.target)}` })}<div class="arrow"><b>${P(L.ctrProfile.actual)}</b>→</div>
      ${stat('Linktree view', N(L.views), { level: L.ctrProfile.level, pill: pill(L.ctrProfile, 0), sub: `CTR profile ${P(L.ctrProfile.actual)} · sasaran 17%` })}<div class="arrow">→</div>
      ${stat('Unique view', N(L.unique.actual), { level: L.unique.level, pill: pill(L.unique, 0), sub: `${MON[pm - 1]} ${N(L.unique.prev)} · sasaran ${N(L.unique.target)}` })}<div class="arrow"><b>${P(L.ctrAction.actual, 0)}</b>→</div>
      ${stat('Unique click', N(L.uniqueClick), { level: L.ctrAction.level, pill: pill(L.ctrAction, 0), sub: `Action CTR ${P(L.ctrAction.actual)} · sasaran 80%` })}</div>`;
    const lc = KR.leadMonth(state.ds, y, m);
    const recLead = r => r.key && KR.OUT.includes(r.key) ? N(lc.outlets[r.key].lead.total) : r.key === 'HQon' ? N(lc.hq.online) : r.key === 'HQbb' ? N(lc.hq.buyback) : '-';
    h += sec('Klik dari Linktree', `${MON[pm - 1]} lawan ${MON[m - 1]}, sasaran KPI dan lead direkod`);
    const waRows = L.clicks.filter(r => /^WhatsApp/.test(r.label));
    const waSum = k => waRows.some(r => r[k] != null) ? waRows.reduce((a, r) => a + (r[k] || 0), 0) : null;
    h += table(['Klik', MON[pm - 1], MON[m - 1], 'MoM', 'Sasaran', 'Ach', `Lead direkod ${MON[m - 1]}`], [
      ...L.clicks.map(r => tr([esc(r.label), N(r.prev), N(r.actual), momR(r), r.target == null ? '-' : N(r.target), r.target == null ? '-' : pill(r, 0), recLead(r)])),
      tr(['<b>Jumlah WhatsApp</b>', N(waSum('prev')), N(waSum('actual')), mom(KR.change(waSum('actual'), waSum('prev'))), '6,000*', pill(KR.kpiRow({ actual: L.clicks.filter(r => KR.OUT.includes(r.key)).reduce((a, r) => a + (r.actual || 0), 0), target: 6000 }), 0), N(lc.lead.total + (lc.hq.online || 0) + (lc.hq.buyback || 0))], 'tot')]);
    h += noteP('Platform dari CONTENT SUBMIT (tab Tiktok, Facebook, Instagram, Youtube, Threads, Telegram); Total view semua platform = TikTok + FB + IG + YT + Threads + Telegram (Threads & Telegram data mula Okt 2026), followers = jumlah hujung bulan; klik dari REPORT CONTENT DATA (LINKTREE). * Sasaran WhatsApp 1,500 setiap outlet (4 outlet sahaja; HQ tiada sasaran), Ach pada 4 outlet. Lead direkod datang daripada semua sumber, jadi tidak dibahagi dengan klik. CTR YouTube bulanan = purata CTR harian. Lost follower / subscriber: turun = hijau.');
    // Trend setiap platform (halaman 15 - 19)
    h += sec('Trend platform', `${y} lawan ${y - 1}`);
    const tabs = [['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['threads', 'Threads'], ['telegram', 'Telegram'], ['linktree', 'Linktree']];
    h += `<div class="chips" role="tablist">${tabs.map(([k, n]) => `<button role="tab" data-plat="${k}" aria-selected="${state.plat === k}">${n}</button>`).join('')}</div>`;
    h += platTrend(y, m);
    return h;
  }
  function platTrend(y, m) {
    const M = KR.monthly(state.ds, y), k = state.plat;
    const DEF = {
      tiktok: [['views', 'View'], ['reach', 'Reach'], ['profileViews', 'Profile view'], ['likes', 'Likes'], ['comments', 'Comments'], ['shares', 'Shares'], ['websiteClicks', 'Website click'], ['newFollowers', 'New follower'], ['lostFollowers', 'Lost follower'], ['netGrowth', 'Net follower']],
      facebook: [['views', 'View'], ['reach', 'Reach'], ['visit', 'Visit'], ['interactions', 'Interactions'], ['follow', 'Follow'], ['linkClick', 'Link click']],
      instagram: [['views', 'View'], ['reach', 'Reach'], ['visit', 'Visit'], ['interactions', 'Interactions'], ['follow', 'Follow'], ['linkClick', 'Link click']],
      youtube: [['views', 'View'], ['watchHours', 'Watch time (jam)'], ['impressions', 'Impressions'], ['ctr', 'CTR (%)'], ['newSubs', 'New subscriber'], ['lostSubs', 'Lost subscriber'], ['netSubs', 'Net subscriber']],
      threads: [['views', 'Views'], ['follows', 'Follows'], ['unfollows', 'Unfollows'], ['netFollowers', 'Net followers'], ['followers', 'Followers (hujung bulan)']],
      telegram: [['views', 'Views'], ['shares', 'Shares'], ['reactions', 'Reactions'], ['joined', 'Joined'], ['left', 'Left'], ['netGrowth', 'Net growth'], ['followers', 'Followers (hujung bulan)']],
      linktree: [['ltViews', 'Linktree view'], ['uniqueClicks', 'Unique view'], ['uniqueClick', 'Unique click'], ['ltProfileCtr', 'CTR profile (%)'], ['ltActionCtr', 'Action CTR (%)'], ['ltWa', 'WhatsApp 4 outlet'], ['ltLoc', 'Lokasi 4 outlet'], ['telegram', 'Telegram']],
    }[k];
    const get = (r, f) => k === 'linktree' ? (['ltProfileCtr', 'ltActionCtr', 'ltWa', 'ltLoc'].includes(f) ? r[f] : r.lt ? r.lt[f] ?? null : null) : r[k] ? r[k][f] ?? null : null;
    const cut = (arr) => arr.map((v, i) => i + 1 > m ? null : v);
    const ly = !['linktree', 'threads', 'telegram'].includes(k);
    let h = `<div class="grid2">${DEF.map(([f, label]) => `<div class="card"><h4>${label}</h4>${lineChart([{ name: String(y), values: cut(M.cur.map(r => get(r, f))) }, ...(ly ? [{ name: String(y - 1), values: M.ly.map(r => get(r, f)) }] : [])], { hl: m, h: 160, cols: 2, pct: /ctr/i.test(f), aria: label })}</div>`).join('')}</div>`;
    h += table(['Metrik', ...MON.slice(0, m)], DEF.map(([f, label]) => tr([label, ...M.cur.slice(0, m).map(r => { const v = get(r, f); return /ctr/i.test(f) ? P(v, 2) : N(v); })])), { cls: 'dense wide' });
    if (k === 'threads' || k === 'telegram') h += noteP('Data tab ' + (k === 'threads' ? 'Threads' : 'Telegram') + ' bermula 1 Okt 2026, jadi tiada perbandingan tahun lepas.');
    if (k === 'linktree') h += noteP('Tab LINKTREE disimpan untuk tahun ' + CFG.linktree.year + ' sahaja.');
    return h;
  }

  // ================= 9. IKLAN =================
  function vIklan(key) {
    const [y, m] = parseKey(key), a = KR.ads(state.ds, y, m), c = a.cur;
    let h = head(y, m, `${periodNote(y, m)} · tanpa angka RM (spend & kos kekal dalam laporan bulanan)`);
    if (!a.loaded) return h + `<div class="warn-box">Sheet "KLIKI Iklan Mirror (untuk Dashboard, tanpa RM)" belum boleh dibaca. Buka sheet itu dan klik "Allow access" pada sel A1 dan K1 (IMPORTRANGE), kemudian muat semula.</div>`;
    h += sec(`Meta Ads (CTWA), ${monLabel(y, m)}`, 'Tracker Meta Ads tab Prestasi');
    if (!c.hasMeta) h += `<p class="mute">Tiada baris Meta Ads untuk bulan ini.</p>`;
    else {
      h += `<div class="grid4">${stat('Chat dimulakan', N(c.metaChat.total), { sub: 'messaging conversations started' })}${stat('Kontak baru', N(c.metaNew.total))}${stat('Link click', N(c.metaLink.total))}${stat('Impressions', N(c.metaImpr.total), { sub: `Reach ${N(c.metaReach.total)} (jumlah ad set)` })}</div>`;
      h += table(['Outlet', 'Kategori', 'Impressions', 'Reach', 'Link click', 'Chat dimulakan', 'Kontak baru'], c.metaRows.map(r => tr([ONAME[r.outlet], esc(r.kategori), N(r.impressions), N(r.reach), N(r.linkClick), N(r.chat), N(r.newContact)])), { cls: 'dense' });
    }
    h += sec(`Google Ads & Google Business Profile, ${monLabel(y, m)}`, 'Tracker Google Ads (Raxbit) tab Prestasi');
    if (!c.hasGoogle) h += `<p class="mute">Tiada baris Google Ads untuk bulan ini.</p>`;
    else h += table(['Outlet', 'Impressions', 'Klik', 'Call click (iklan)', 'Arah (iklan)', 'GBP call', 'GBP chat', 'GBP arah'], [...KR.OUT.map(x => tr([ONAME[x], N(c.gImpr[x]), N(c.gClicks[x]), N(c.adCalls[x]), N(c.adDir[x]), N(c.gbpCalls[x]), N(c.gbpChat[x]), N(c.gbpDir[x])])),
      tr(['Total', N(c.gImpr.total), N(c.gClicks.total), N(c.adCalls.total), N(c.adDir.total), N(c.gbpCalls.total), N(c.gbpChat.total), N(c.gbpDir.total)], 'tot')], { cls: 'dense' });
    h += sec('Trend 6 bulan');
    const lbl = a.trend.map(r => MON[r.m - 1]);
    h += `<div class="grid2"><div class="card"><h4>Google: call & arah</h4>${barChart(lbl, [{ name: 'Call (iklan)', values: a.trend.map(r => r.adCalls) }, { name: 'Arah (iklan)', values: a.trend.map(r => r.adDir) }, { name: 'GBP chat', values: a.trend.map(r => r.gbpChat) }], { cols: 2 })}</div>
      <div class="card"><h4>Meta: chat CTWA</h4>${barChart(lbl, [{ name: 'Chat dimulakan', values: a.trend.map(r => r.metaChat) }, { name: 'Link click', values: a.trend.map(r => r.metaLink) }], { cols: 2 })}</div></div>`;
    h += noteP('Spend, kos per chat, CPC dan invois tidak dipapar di dashboard kerana site ini public; angka RM kekal dalam laporan bulanan dan tracker asal. Bajet Google Ads Kelang Lama RM1/hari ialah arahan En Azizi kepada Raxbit.');
    return h;
  }

  // ================= 10. SETIAP OUTLET =================
  async function vDrill(key) {
    const d = await monthData(key), { y, m, pm } = d, x = state.outlet, ds = state.ds;
    const lo = KR.leadOutlets(ds, y, m).find(o => o.x === x), ok = KR.outletKpi(ds, y, m, d.P.googleReview), s = KR.sources(ds, y, m), M = KR.monthly(ds, y);
    let h = `<div class="chips">${KR.OUT.map(o => `<button data-outlet="${o}" aria-selected="${o === x}">${ONAME[o]}</button>`).join('')}</div>`;
    h += head(y, m, `${ONAME[x]} · ${periodNote(y, m)}`);
    const tot = lo.rows.find(r => r.id === 'total');
    h += `<div class="grid3">${stat('Lead', N(tot.lead.actual), { level: tot.lead.level, pill: pill(tot.lead), bar: bar(tot.lead), sub: `Plan ${N(tot.lead.target)} · ${momR(tot.lead)} vs ${MON[pm - 1]}` })}${stat('Walk-in', N(tot.walkin.actual), { level: tot.walkin.level, pill: pill(tot.walkin), bar: bar(tot.walkin), sub: `Plan ${N(tot.walkin.target)} · ${momR(tot.walkin)} vs ${MON[pm - 1]}` })}${stat('Conversion', P(tot.l2w), { sub: 'Target 40%' })}</div>`;
    h += sec('Lead dan Walk-in ikut kategori', 'Actual vs Plan');
    h += table(['Kategori', 'Lead', 'Plan', 'Ach', 'Walk-in', 'Plan', 'Ach', 'Lead-to-walk-in'], lo.rows.map(r => r.na ? tr([r.label, '<span class="mute">N/A</span>', '', '', '', '', '', '']) : tr([r.label, N(r.lead.actual), N(r.lead.target), pill(r.lead, 0), N(r.walkin.actual), N(r.walkin.target), pill(r.walkin, 0), P(r.l2w)], r.id === 'total' ? 'tot' : '')));
    const cut = arr => arr.map((v, i) => i + 1 > m ? null : v);
    h += sec('Trend lead & walk-in', `${y} lawan ${y - 1}`);
    h += `<div class="card">${lineChart([{ name: 'Lead ' + y, values: cut(M.cur.map(r => r.outlet[x].lead)) }, { name: 'Walk-in ' + y, values: cut(M.cur.map(r => r.outlet[x].walkin)) }, { name: 'Lead ' + (y - 1), values: M.ly.map(r => r.outlet[x].lead) }], { hl: m, aria: 'Trend ' + ONAME[x] })}</div>`;
    h += sec('KPI outlet');
    h += table(['KPI', 'Actual', 'Target', 'Achievement'], ok.rows.map(r => { const c = r.cells[x]; return c.na ? tr([r.label, '<span class="mute">N/A</span>', '', '']) : tr([r.label, c.unit === '%' ? P(c.actual) : N(c.actual), c.unit === '%' ? P(c.target) : N(c.target), pill(c, 0)]); }));
    const p = s.per[x];
    h += sec('Sumber klik ke outlet');
    h += `<div class="grid4">${stat('Klik WhatsApp', N(p.wa), { sub: `Linktree ${N(p.ltWa)} · Meta ${N(p.meta)} · GBP ${N(p.gbp)}` })}${stat('Lead ÷ klik', P(p.leadPerClick))}${stat('Call', N(p.call), { sub: 'Google Ads + GBP' })}${stat('Arah', N(p.dir), { sub: 'Google Ads + GBP + Linktree' })}</div>`;
    if (d.c) {
      const posts = d.P.posts.filter(q => q.outlet === x), v = posts.reduce((a, q) => a + (q.views || 0), 0);
      h += sec('Content outlet bulan ini');
      h += `<div class="grid3">${stat('Post', N(posts.length))}${stat('View', N(v))}${stat('Purata view', N(posts.length ? v / posts.length : null))}</div>`;
      if (posts.length) h += table(['Tarikh', 'Kategori', 'Type', 'Sub', 'View'], [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).map(q => tr([`${String(q.date ? q.date.d : '').padStart(2, '0')}/${String(m).padStart(2, '0')}`, esc(q.kategori), esc(q.type), esc(q.sub), N(q.views)])), { cls: 'dense' });
    }
    return h;
  }

  // ================= 11. DAPATAN =================
  async function vDapatan(key) {
    const d = await monthData(key), { y, m, sc } = d, f = KR.findings(sc);
    let h = head(y, m);
    h += sec('Dapatan automatik', 'dikira dari Scorecard KPI');
    h += findingsList(f);
    if (f.movers.length) {
      h += sec('Perubahan terbesar berbanding bulan lepas');
      h += table(['KPI', 'Actual', 'Bulan lepas', 'MoM'], f.movers.map(r => tr([esc(r.label), N(r.actual), N(r.prev), momR(r)])));
    }
    h += sec('KPI ikut kumpulan');
    h += table(['Kumpulan', 'Hijau', 'Kuning', 'Merah', 'Tiada data'], sc.groups.map(g => tr([esc(g.title), N(g.rows.filter(r => r.level === 'good').length), N(g.rows.filter(r => r.level === 'warn').length), N(g.rows.filter(r => r.level === 'bad').length), N(g.rows.filter(r => r.level === 'na').length)])));
    h += noteP('Key Finding dan Tindakan (PIC, tarikh) dalam laporan bulanan ditulis semula setiap bulan dan disahkan Hafiz. Dashboard hanya senaraikan dapatan yang boleh dikira terus dari data.');
    return h;
  }

  // ---------- info ----------
  function fillInfo() {
    const ds = state.ds; if (!ds) return;
    const names = { tiktok: 'Tiktok', facebook: 'Facebook', instagram: 'Instagram', youtube: 'Youtube', threads: 'Threads', telegram: 'Telegram', supply: 'Supply Video V2', beforeAfter: 'Before/After', customer: 'Customer', leadDetail: 'Lead Walk-in Mirror (masterFRONT)', linktree: 'LINKTREE', ads: 'Iklan Mirror (Meta + Google, tanpa RM)' };
    const li = Object.entries(names).map(([k, n]) => { const s = ds.sources[k]; if (!s) return ''; return `<li><span class="${s.ok ? 'ok' : 'no'}">${s.ok ? '●' : '✕'}</span> ${n}: ${s.ok ? s.rows + ' baris' : esc(s.error)}</li>`; }).join('');
    $('#info-body').innerHTML = `<ul class="health">${li}</ul><p class="health">Dimuat ${new Date(ds.loadedAt).toLocaleString('ms-MY')}. Data dibaca terus dari Google Sheet setiap kali app dibuka.</p>
      <p class="health">Warna Ach: ≥100% hijau, 80 - 99% kuning, bawah 80% merah (nilai dibundar). Bulan berjalan: warna ikut kadar hari operasi (garis menegak pada bar). ▲▼ hijau = baik, merah = buruk; lost follower / subscriber turun = hijau.</p>`;
  }

  // ---------- render ----------
  const VIEWS = { ringkasan: vRingkasan, scorecard: vScorecard, lead: vLead, outlet: vOutlet, trend: vTrend, sumber: vSumber, content: vContent, platform: vPlatform, iklan: vIklan, drill: vDrill, dapatan: vDapatan };
  let renderSeq = 0;
  async function render() {
    const seq = ++renderSeq;
    document.querySelectorAll('#tabs button').forEach(b => { const on = b.dataset.tab === state.tab; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const act = document.querySelector('#tabs button.active'); if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const title = state.tab === 'drill' ? `Outlet: ${ONAME[state.outlet]}` : TITLES[state.tab];
    $('#page-title').textContent = title; document.title = `${title} – KLIKI Laporan Marketing`;
    $('#foot-src').textContent = 'Sumber: ' + SRC[state.tab];
    if (!state.ds) return;
    const view = $('#view');
    view.className = 'v-' + state.tab;
    if (!state.ds.posts[state.month]) view.innerHTML = `<div class="loading"><div class="spinner"></div><p>Memuatkan ${monLabel(...parseKey(state.month))}…</p></div>`;
    let html;
    try { html = await VIEWS[state.tab](state.month); } catch (e) { console.error(e); html = `<div class="warn-box">Ralat paparan: ${esc(e.message)}</div>`; }
    if (seq !== renderSeq) return;
    view.innerHTML = html;
    fillInfo();
  }

  function fillMonths() {
    const months = KD.monthsAvailable(state.ds).filter(k => k >= '2025-01');
    const now = new Date(), cur = KD.ym(now.getFullYear(), now.getMonth() + 1);
    if (!months.includes(cur)) months.push(cur);
    const sel = $('#month');
    sel.innerHTML = months.slice().reverse().map(k => `<option value="${k}">${monLabel(...parseKey(k))}${k === cur ? ' (berjalan)' : ''}</option>`).join('');
    if (!state.picked || !months.includes(state.month)) {
      // lalai: bulan penuh terakhir (laporan bulanan); bulan berjalan boleh dipilih
      const [py, pm] = KD.prevYM(now.getFullYear(), now.getMonth() + 1);
      const last = KD.ym(py, pm);
      state.month = months.includes(last) ? last : months[months.length - 1];
    }
    sel.value = state.month;
  }

  function persist() { if (state.ds) { const { posts, ...rest } = state.ds; localSet(CACHE_KEY, JSON.stringify({ ...rest, posts: {} })); } }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    const btn = $('#refresh'), line = $('#status-line');
    btn.classList.add('spin'); line.className = 'status-line'; line.textContent = 'Mengemas kini dari Google Sheet…';
    try {
      const ds = await KD.loadAll((d, n) => { line.textContent = `Mengemas kini… ${d}/${n}`; });
      const failed = Object.entries(ds.sources).filter(([, s]) => !s.ok);
      if (failed.length === Object.keys(ds.sources).length) throw new Error(failed[0][1].error);
      state.ds = ds; persist(); fillMonths();
      line.textContent = `Dikemas kini ${new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}` + (failed.length ? ` · ${failed.length} sumber gagal (ketik ⓘ)` : '');
      if (failed.length) line.className = 'status-line err';
      await render();
    } catch (e) {
      line.className = 'status-line err';
      line.textContent = state.ds ? `Offline, papar data simpanan ${new Date(state.ds.loadedAt).toLocaleString('ms-MY')}` : `Gagal muat data: ${e.message}`;
      if (!state.ds) $('#view').innerHTML = `<div class="warn-box">Tak dapat capai Google Sheet. Semak internet, atau pastikan sheet dikongsi "Anyone with the link".</div>`;
    } finally { state.loading = false; btn.classList.remove('spin'); }
  }

  // ---------- events ----------
  const go = tab => { state.tab = tab; localSet('kliki-lap-tab', tab); render(); scrollTo(0, 0); };
  $('#month').addEventListener('change', e => { state.month = e.target.value; state.picked = true; render(); scrollTo(0, 0); });
  $('#refresh').addEventListener('click', () => { if (state.ds) state.ds.posts = {}; load(); });
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-outlet]');
    if (o) { state.outlet = o.dataset.outlet; localSet('kliki-lap-outlet', state.outlet); go('drill'); return; }
    const pl = e.target.closest('[data-plat]');
    if (pl) { state.plat = pl.dataset.plat; render(); }
  });
  $('#info').addEventListener('click', () => { fillInfo(); $('#info-dlg').showModal(); });
  $('#info-close').addEventListener('click', () => $('#info-dlg').close());
  $('#info-dlg').addEventListener('click', e => { if (e.target.id === 'info-dlg') e.target.close(); });
  let lastW = innerWidth, rT;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (Math.abs(innerWidth - lastW) > 40 && state.ds) { lastW = innerWidth; render(); } }, 200); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.ds && Date.now() - new Date(state.ds.loadedAt) > 10 * 60 * 1000) { state.ds.posts = {}; load(); } });

  // ---------- boot ----------
  try { const c = localGet(CACHE_KEY); if (c) { state.ds = JSON.parse(c); state.ds.posts = {}; fillMonths(); render(); } } catch { /* cache rosak */ }
  load();
  if ('serviceWorker' in navigator && location.protocol === 'https:' && /github\.io$/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
