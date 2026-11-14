// KLIKI Marketing Dashboard — enjin KPI ikut Laporan Marketing Bulanan
// Rujukan: "Peta Sumber Data Laporan Bulanan.md" (Drive Hafiz), seksyen 4 (peraturan) & 6 (sasaran KPI).
// Semua angka yang dipapar dalam UI dikira di sini (atau dalam data.js). app.js hanya paparan.
(function (root) {
  const CFG = root.KLIKI_CONFIG || (typeof require !== 'undefined' ? require('./config.js') : null);
  const KD = root.KD || (typeof require !== 'undefined' ? require('./data.js') : null);
  const T = CFG.targets;
  const OUT = ['KUL', 'AOR', 'SP', 'PDG']; // susunan halaman KPI Outlet laporan
  const CATS = ['phone', 'repair', 'cc'];
  const CAT_LABEL = { phone: 'Phone', repair: 'Repair', cc: 'CC' };
  const { ym, daysIn, prevYM, inMonth, sum } = KD;

  // ---------- konteks bulan ----------
  // Bulan berjalan: warna ikut kadar hari (tanpa pengecualian "sedang naik"). Bulan tutup: ikut peraturan laporan.
  function today() { const n = root.__KLIKI_TODAY ? new Date(root.__KLIKI_TODAY) : new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }
  function isLive(y, m) { const t = today(); return t.y === y && t.m === m; }
  function calPace(y, m) { if (!isLive(y, m)) return 1; const t = today(); return Math.min(1, Math.max(1, t.d - 1) / daysIn(y, m)); }

  // ---------- warna & perubahan ----------
  const r1 = x => Math.round(x * 10) / 10;
  // Ach ≥100% hijau, 80–99% kuning, <80% merah, ikut nilai dibundar (1 titik perpuluhan, seperti dipapar)
  function levelOf(pct) { if (pct == null || !Number.isFinite(pct)) return 'na'; const p = r1(pct); return p >= 100 ? 'good' : p >= 80 ? 'warn' : 'bad'; }
  // MoM/YoY: % untuk kiraan, pt untuk peratus (CTR, conversion), mutlak untuk metrik yang boleh negatif (net follower)
  function change(a, p, kind) {
    if (a == null || p == null) return null;
    if (kind === 'pt') return { kind: 'pt', v: a - p };
    if (kind === 'abs') return { kind: 'abs', v: a - p };
    if (p === 0) return null;
    return { kind: 'pct', v: 100 * (a - p) / Math.abs(p) };
  }
  // good: ▲ hijau = baik. invert (lost follower / lost subscriber / kos): turun = hijau.
  const goodDir = (ch, invert) => ch == null ? null : (invert ? ch.v <= 0 : ch.v >= 0);

  // Satu baris KPI. pace < 1 hanya untuk bulan berjalan.
  function kpiRow(o) {
    const unit = o.unit || 'n', momKind = o.momKind || (unit === '%' ? 'pt' : o.floor ? 'abs' : 'pct');
    const has = o.actual != null && o.target != null;
    const ach = has && !o.floor && o.target ? 100 * o.actual / o.target : null;
    const pace = o.pace == null ? 1 : o.pace;
    let level = 'na';
    if (has) level = o.floor ? (o.actual >= o.target ? 'good' : 'bad') : levelOf(pace < 1 ? 100 * o.actual / (o.target * Math.max(pace, 1e-4)) : ach);
    const prevCmp = o.prev == null ? null : (pace < 1 && unit !== '%' && !o.floor ? o.prev * pace : o.prev);
    const mom = change(o.actual, prevCmp, momKind);
    return { ...o, unit, pace, partial: pace < 1, ach, level, gap: has ? o.actual - o.target : null, mom, momGood: goodDir(mom, o.invert) };
  }

  // ---------- nilai asas bulan ----------
  function linktree(ds, y, m) { return ds.linktree && y === CFG.linktree.year && ds.linktree[m] ? ds.linktree[m] : null; }
  function ltSum(lt, prefix) { if (!lt || !OUT.some(x => lt[prefix + x] != null)) return null; return OUT.reduce((a, x) => a + (lt[prefix + x] || 0), 0); }
  // CTR Profile → Linktree = Linktree total view ÷ TikTok profile visit (Tiktok Insight, bukan tab LINKTREE) × 100
  function ctrProfile(ds, y, m) {
    const lt = linktree(ds, y, m), pv = KD.social(ds, y, m).tiktok.profileViews;
    if (lt && lt.ltViews != null && pv) return 100 * lt.ltViews / pv;
    return lt ? lt.ctrProfile ?? null : null;
  }
  // CTR Action = unique click ÷ unique view × 100
  function ctrAction(lt) { if (!lt) return null; if (lt.uniqueClick != null && lt.uniqueClicks) return 100 * lt.uniqueClick / lt.uniqueClicks; return lt.ctrAction ?? null; }

  // Lead & walk-in 4 outlet, Phone + Repair + CC sahaja (HQ & Others diasingkan)
  function leadMonth(ds, y, m) {
    const rows = (ds.leadDetail || []).filter(inMonth(y, m));
    const o = { days: rows.length, lead: {}, walkin: {}, outlets: {}, others: { lead: null, walkin: null }, hq: { online: null, buyback: null } };
    const add = (acc, k, v) => { if (v != null) acc[k] = (acc[k] || 0) + v; };
    for (const x of OUT) o.outlets[x] = { lead: {}, walkin: {} };
    for (const r of rows) {
      for (const x of OUT) {
        const v = r[x]; if (!v) continue;
        for (const kind of ['lead', 'walkin']) {
          for (const c of CATS) { add(o[kind], c, v[kind][c]); add(o.outlets[x][kind], c, v[kind][c]); }
          add(o.others, kind, v[kind].others);
        }
      }
      if (r.HQ) { add(o.hq, 'online', r.HQ.lead[0]); add(o.hq, 'buyback', r.HQ.lead[1]); }
    }
    const tot = src => CATS.every(c => src[c] == null) ? null : CATS.reduce((a, c) => a + (src[c] || 0), 0);
    o.lead.total = tot(o.lead); o.walkin.total = tot(o.walkin);
    for (const x of OUT) { o.outlets[x].lead.total = tot(o.outlets[x].lead); o.outlets[x].walkin.total = tot(o.outlets[x].walkin); }
    for (const kind of ['lead', 'walkin']) for (const c of CATS) if (o[kind][c] === undefined) o[kind][c] = null;
    return o;
  }
  const l2w = (lead, walk) => lead ? 100 * (walk || 0) / lead : null;

  // Pace lead/walk-in untuk bulan berjalan: ikut hari operasi setiap outlet (Rabu tutup kecuali Kulim/Kelang Lama)
  function leadPace(ds, y, m, kind, c = 'total', outlet = null) {
    if (!isLive(y, m)) return 1;
    const plan = KD.leadPlan(y, m), prog = KD.leadProgress(ds, y, m);
    if (!plan) return calPace(y, m);
    if (outlet) return prog.outlets[outlet].pace;
    let t = 0, e = 0;
    for (const x of OUT) { const v = plan.outlets[x][kind][c]; t += v; e += v * prog.outlets[x].pace; }
    return t ? e / t : 1;
  }

  // ---------- 1. Scorecard KPI Marketing (33 KPI, susunan laporan halaman 3 + 11) ----------
  // c / pc = KD.contentStats bulan ini / bulan lepas (null jika tab per-post tiada)
  function scorecard(ds, y, m, c, pc) {
    const [py, pm] = prevYM(y, m);
    const s = KD.social(ds, y, m), ps = KD.social(ds, py, pm);
    const co = KD.company(ds, y, m), pco = KD.company(ds, py, pm);
    const lt = linktree(ds, y, m), plt = linktree(ds, py, pm);
    const L = leadMonth(ds, y, m), PL = leadMonth(ds, py, pm), plan = KD.leadPlan(y, m);
    const cp = calPace(y, m), ttPace = isLive(y, m) && s.tiktok.days ? Math.min(1, s.tiktok.days / daysIn(y, m)) : 1;
    const allDays = co.plats.filter(p => p.days).map(p => p.days), allPace = isLive(y, m) && allDays.length ? Math.min(1, Math.min(...allDays) / daysIn(y, m)) : 1;
    const ct = (k) => c && c.total ? k(c) : null, pct = (k) => pc && pc.total ? k(pc) : null;
    const groups = [];
    const G = (id, title, rows, note) => groups.push({ id, title, rows: rows.map(kpiRow), note });

    G('output', '1. Content Output', [
      { id: 'totalContent', label: 'Total Content', target: T.totalContent, actual: ct(x => x.total), prev: pct(x => x.total), pace: cp },
      { id: 'pov', label: 'POV Customer', target: T.povCustomer, actual: ct(x => x.hasType ? x.pov : null), prev: pct(x => x.hasType ? x.pov : null), pace: cp },
      { id: 'strategic', label: 'Strategic', target: T.strategic, actual: ct(x => x.hasType ? x.strategic : null), prev: pct(x => x.hasType ? x.strategic : null), pace: cp },
    ]);
    G('mix', '2. Content Mix (Strategic)', Object.entries(T.strategicType).map(([k, t]) => (
      { id: 'type_' + k, label: k, target: t, actual: ct(x => x.hasType ? x.typeCount[k] : null), prev: pct(x => x.hasType ? x.typeCount[k] : null), pace: cp })));
    G('subject', '3. Strategic Subject', Object.entries(T.strategicSubject).map(([k, t]) => (
      { id: 'subj_' + k, label: k, target: t, actual: ct(x => x.hasType ? x.subjCount[k] : null), prev: pct(x => x.hasType ? x.subjCount[k] : null), pace: cp })));
    G('views', '4. TikTok Views', [
      { id: 'postViews', label: 'Views per post (video bulan ini)', target: T.viewsPerPost, actual: ct(x => x.views), prev: pct(x => x.views), pace: cp },
      { id: 'ttViews', label: 'Views akaun TikTok', target: T.tiktokViews, actual: s.tiktok.days ? s.tiktok.views : null, prev: ps.tiktok.days ? ps.tiktok.views : null, pace: ttPace },
      { id: 'allViews', label: 'Total view semua platform', target: T.allViews, actual: co.views, prev: pco.views, pace: allPace },
    ]);
    G('bucket', '5. Category View (bucket berasingan)', Object.entries(T.buckets).map(([k, t]) => (
      { id: 'bucket_' + k, label: k === 'Trade-in / CC' ? 'Trade-in / Cash Converter' : k, target: t, actual: ct(x => x.bucketStats[k].views), prev: pct(x => x.bucketStats[k].views), pace: cp })),
      'Bucket tidak dijumlahkan: iPhone/Android tidak termasuk kategori Repair; Trade-in / C&C = Trade-in + Buyback.');
    const tt = s.tiktok.days ? s.tiktok : null, ptt = ps.tiktok.days ? ps.tiktok : null;
    const tk = (k) => tt ? tt[k] : null, ptk = (k) => ptt ? ptt[k] : null;
    G('engagement', '6. Engagement & Followers (TikTok)', [
      { id: 'likes', label: 'Likes', target: T.likes, actual: tk('likes'), prev: ptk('likes'), pace: ttPace },
      { id: 'comments', label: 'Comments', target: T.comments, actual: tk('comments'), prev: ptk('comments'), pace: ttPace },
      { id: 'shares', label: 'Shares', target: T.shares, actual: tk('shares'), prev: ptk('shares'), pace: ttPace },
      { id: 'profileViews', label: 'Profile Views', target: T.profileViews, actual: tk('profileViews'), prev: ptk('profileViews'), pace: ttPace },
      { id: 'newFollowers', label: 'New Followers', target: T.newFollowers, actual: tk('newFollowers'), prev: ptk('newFollowers'), pace: ttPace },
      { id: 'netGrowth', label: 'Net Followers (minimum)', target: T.netFollowersFloor, actual: tk('netGrowth'), prev: ptk('netGrowth'), floor: true, pace: 1 },
    ]);
    G('traffic', '7. Traffic (Linktree)', [
      { id: 'uniqueView', label: 'Unique Linktree', target: T.uniqueLinktree, actual: lt ? lt.uniqueClicks ?? null : null, prev: plt ? plt.uniqueClicks ?? null : null, pace: cp },
      { id: 'ctrProfile', label: 'Profile → Linktree CTR', target: T.ctrProfile, actual: ctrProfile(ds, y, m), prev: ctrProfile(ds, py, pm), unit: '%' },
      { id: 'ctrAction', label: 'Linktree Action CTR', target: T.ctrAction, actual: ctrAction(lt), prev: ctrAction(plt), unit: '%' },
      { id: 'telegram', label: 'Telegram', target: T.telegram, actual: lt ? lt.telegram ?? null : null, prev: plt ? plt.telegram ?? null : null, pace: cp },
      { id: 'wa', label: 'WhatsApp clicks (4 outlet)', target: OUT.reduce((a, x) => a + T.outlet[x].wa, 0), actual: ltSum(lt, 'wa_'), prev: ltSum(plt, 'wa_'), pace: cp },
      { id: 'location', label: 'Location clicks (4 outlet)', target: OUT.reduce((a, x) => a + T.outlet[x].location, 0), actual: ltSum(lt, 'loc_'), prev: ltSum(plt, 'loc_'), pace: cp },
    ]);
    G('leads', '8. Leads & Walk-in', [
      { id: 'leads', label: 'Leads (4 outlet)', target: plan ? plan.company.lead.total : null, actual: L.lead.total, prev: PL.lead.total, pace: leadPace(ds, y, m, 'lead') },
      { id: 'walkin', label: 'Walk-in (4 outlet)', target: plan ? plan.company.walkin.total : null, actual: L.walkin.total, prev: PL.walkin.total, pace: leadPace(ds, y, m, 'walkin') },
      { id: 'conversion', label: 'Conversion (Walk-in ÷ Leads)', target: T.conversion, actual: l2w(L.lead.total, L.walkin.total), prev: l2w(PL.lead.total, PL.walkin.total), unit: '%' },
    ], 'Leads & Walk-in ikut Plan Sales (Kliki Marketing Brief). Phone + Repair + CC sahaja.');

    const all = groups.flatMap(g => g.rows);
    const count = lv => all.filter(r => r.level === lv).length;
    const counted = all.filter(r => r.level !== 'na').length;
    return { groups, rows: all, good: count('good'), warn: count('warn'), bad: count('bad'), na: count('na'), total: all.length, counted, live: isLive(y, m) };
  }

  // ---------- 2. Lead & Walk-in company + Q4 + YTD + segmen ----------
  function leadCompany(ds, y, m) {
    const L = leadMonth(ds, y, m), plan = KD.leadPlan(y, m);
    const [py, pm] = prevYM(y, m), PL = leadMonth(ds, py, pm), LY = leadMonth(ds, y - 1, m);
    const cat = c => {
      const lt = plan ? plan.company.lead[c] : null, wt = plan ? plan.company.walkin[c] : null;
      return {
        id: c, label: c === 'total' ? 'Total' : CAT_LABEL[c],
        lead: kpiRow({ actual: L.lead[c], target: lt, prev: PL.lead[c], pace: leadPace(ds, y, m, 'lead', c) }),
        walkin: kpiRow({ actual: L.walkin[c], target: wt, prev: PL.walkin[c], pace: leadPace(ds, y, m, 'walkin', c) }),
        l2w: l2w(L.lead[c], L.walkin[c]),
      };
    };
    const conversion = kpiRow({ actual: l2w(L.lead.total, L.walkin.total), target: T.conversion, prev: l2w(PL.lead.total, PL.walkin.total), unit: '%' });
    return {
      plan, live: isLive(y, m), days: L.days,
      lastDay: (ds.leadDetail || []).filter(inMonth(y, m)).reduce((a, r) => Math.max(a, r.date.d), 0),
      rows: [...CATS, 'total'].map(cat), conversion,
      convPrev: l2w(PL.lead.total, PL.walkin.total), convLY: l2w(LY.lead.total, LY.walkin.total),
      segments: { hqOnline: L.hq.online, hqBuyback: L.hq.buyback, othersLead: L.others.lead, othersWalk: L.others.walkin },
      quarter: quarter(ds, y, m), ytd: ytd(ds, y, m),
    };
  }
  // Kumulatif suku tahun (Plan dari brief). Baris bulan akan datang: plan sahaja.
  function quarter(ds, y, m) {
    const q0 = Math.floor((m - 1) / 3) * 3 + 1, months = [q0, q0 + 1, q0 + 2];
    const plans = months.map(mm => KD.leadPlan(y, mm));
    if (plans.some(p => !p || p.key === 'legacy')) return null; // hanya bila Plan Sales lengkap untuk suku itu
    let cl = 0, cw = 0, cpl = 0, cpw = 0;
    const rows = months.map((mm, i) => {
      const done = mm <= m, L = done ? leadMonth(ds, y, mm) : null;
      const pl = plans[i].company.lead.total, pw = plans[i].company.walkin.total;
      const r = { m: mm, planLead: pl, planWalk: pw, done };
      if (done) {
        cl += L.lead.total || 0; cw += L.walkin.total || 0; cpl += pl; cpw += pw;
        Object.assign(r, { lead: L.lead.total, walkin: L.walkin.total, cumLead: cl, cumWalk: cw, cumPlanLead: cpl, cumPlanWalk: cpw,
          ach: kpiRow({ actual: L.lead.total, target: pl, pace: leadPace(ds, y, mm, 'lead') }), achW: kpiRow({ actual: L.walkin.total, target: pw, pace: leadPace(ds, y, mm, 'walkin') }),
          cumAch: kpiRow({ actual: cl, target: cpl }), cumAchW: kpiRow({ actual: cw, target: cpw }) });
      }
      return r;
    });
    const fullL = plans.reduce((a, p) => a + p.company.lead.total, 0), fullW = plans.reduce((a, p) => a + p.company.walkin.total, 0);
    return { q: (q0 + 2) / 3, rows, fullLead: fullL, fullWalk: fullW, cumLead: cl, cumWalk: cw, pctLead: fullL ? 100 * cl / fullL : null, pctWalk: fullW ? 100 * cw / fullW : null };
  }
  // Year to Month: Jan – bulan ini, tahun ini lawan tahun lepas (lead/walk-in P+R+CC)
  function ytd(ds, y, m) {
    const agg = yy => { let l = 0, w = 0, any = false; for (let mm = 1; mm <= m; mm++) { const L = leadMonth(ds, yy, mm); if (L.lead.total != null) { l += L.lead.total; any = true; } if (L.walkin.total != null) w += L.walkin.total; } return any ? { lead: l, walkin: w, conv: l2w(l, w) } : null; };
    const cur = agg(y), ly = agg(y - 1);
    return { cur, ly, leadCh: change(cur && cur.lead, ly && ly.lead), walkCh: change(cur && cur.walkin, ly && ly.walkin), convCh: change(cur && cur.conv, ly && ly.conv, 'pt') };
  }

  // ---------- 3. Lead & Walk-in ikut outlet ----------
  function leadOutlets(ds, y, m) {
    const L = leadMonth(ds, y, m), plan = KD.leadPlan(y, m), [py, pm] = prevYM(y, m), PL = leadMonth(ds, py, pm);
    return OUT.map(x => {
      const o = L.outlets[x], po = PL.outlets[x];
      const cell = (kind, c) => kpiRow({ actual: o[kind][c] ?? null, target: plan ? plan.outlets[x][kind][c] || null : null, prev: po[kind][c] ?? null, pace: leadPace(ds, y, m, kind, c, x) });
      return { x, rows: [...CATS, 'total'].map(c => ({ id: c, label: c === 'total' ? 'Total' : CAT_LABEL[c], lead: cell('lead', c), walkin: cell('walkin', c), l2w: l2w(o.lead[c], o.walkin[c]), na: x === 'PDG' && c === 'repair' })) };
    });
  }

  // ---------- 4. Trend bulanan (tahun ini lawan tahun lepas) ----------
  function monthly(ds, y) {
    const one = (yy, mm) => {
      const s = KD.social(ds, yy, mm), L = leadMonth(ds, yy, mm), co = KD.company(ds, yy, mm), lt = linktree(ds, yy, mm);
      return {
        m: mm, ttViews: s.tiktok.days ? s.tiktok.views : null, allViews: co.views,
        lead: L.lead.total, walkin: L.walkin.total, conv: l2w(L.lead.total, L.walkin.total),
        cat: Object.fromEntries(CATS.map(c => [c, { lead: L.lead[c], walkin: L.walkin[c] }])),
        outlet: Object.fromEntries(OUT.map(x => [x, { lead: L.outlets[x].lead.total, walkin: L.outlets[x].walkin.total }])),
        tiktok: s.tiktok.days ? s.tiktok : null, facebook: s.facebook.days ? s.facebook : null, instagram: s.instagram.days ? s.instagram : null, youtube: s.youtube.days ? s.youtube : null,
        lt, ltProfileCtr: lt ? ctrProfile(ds, yy, mm) : null, ltActionCtr: ctrAction(lt), ltWa: ltSum(lt, 'wa_'), ltLoc: ltSum(lt, 'loc_'),
      };
    };
    const months = [...Array(12)].map((_, i) => i + 1);
    return { y, cur: months.map(mm => one(y, mm)), ly: months.map(mm => one(y - 1, mm)) };
  }

  // ---------- 5. Sumber: Klik → Lead → Walk-in ----------
  function adsMonth(ds, y, m) {
    const k = ym(y, m), A = ds.ads;
    if (!A) return null;
    const meta = A.meta.filter(r => r.key === k), google = A.google.filter(r => r.key === k);
    const by = (arr, f) => { const o = {}; for (const x of OUT) { const rs = arr.filter(r => r.outlet === x); o[x] = rs.length && rs.some(r => f(r) != null) ? sum(rs, f) : null; } return o; };
    const tot = o => OUT.every(x => o[x] == null) ? null : OUT.reduce((a, x) => a + (o[x] || 0), 0);
    const pack = (arr, f) => { const o = by(arr, f); o.total = tot(o); return o; };
    return {
      hasMeta: meta.length > 0, hasGoogle: google.length > 0, metaRows: meta, googleRows: google,
      metaChat: pack(meta, r => r.chat), metaImpr: pack(meta, r => r.impressions), metaReach: pack(meta, r => r.reach), metaLink: pack(meta, r => r.linkClick), metaNew: pack(meta, r => r.newContact),
      gbpChat: pack(google, r => r.gbpChat), gbpCalls: pack(google, r => r.gbpCalls), gbpDir: pack(google, r => r.gbpDirections),
      adCalls: pack(google, r => r.adCalls), adDir: pack(google, r => r.adDirections), gImpr: pack(google, r => r.impressions), gClicks: pack(google, r => r.clicks),
    };
  }
  function sources(ds, y, m) {
    const one = (yy, mm) => {
      const lt = linktree(ds, yy, mm), ad = adsMonth(ds, yy, mm), L = leadMonth(ds, yy, mm);
      const per = {};
      for (const x of OUT) {
        const ltWa = lt ? lt['wa_' + x] ?? null : null, meta = ad && ad.hasMeta ? ad.metaChat[x] : null, gbp = ad && ad.hasGoogle ? ad.gbpChat[x] : null;
        const wa = [ltWa, meta, gbp].some(v => v != null) ? (ltWa || 0) + (meta || 0) + (gbp || 0) : null;
        const call = ad && ad.hasGoogle ? (ad.adCalls[x] || 0) + (ad.gbpCalls[x] || 0) : null;
        const loc = lt ? lt['loc_' + x] ?? null : null;
        const dir = ad && ad.hasGoogle ? (ad.adDir[x] || 0) + (ad.gbpDir[x] || 0) + (loc || 0) : loc;
        const lead = L.outlets[x].lead.total, walk = L.outlets[x].walkin.total;
        per[x] = { ltWa, meta, gbp, wa, lead, walk, leadPerClick: wa ? 100 * (lead || 0) / wa : null, call, dir, all: wa != null || call != null || dir != null ? (wa || 0) + (call || 0) + (dir || 0) : null };
        per[x].walkPerAll = per[x].all ? 100 * (walk || 0) / per[x].all : null;
      }
      const T2 = k => OUT.every(x => per[x][k] == null) ? null : OUT.reduce((a, x) => a + (per[x][k] || 0), 0);
      const total = { ltWa: T2('ltWa'), meta: T2('meta'), gbp: T2('gbp'), wa: T2('wa'), lead: L.lead.total, walk: L.walkin.total, call: T2('call'), dir: T2('dir'), all: T2('all') };
      total.leadPerClick = total.wa ? 100 * (total.lead || 0) / total.wa : null;
      total.walkPerClick = total.wa ? 100 * (total.walk || 0) / total.wa : null;
      total.walkPerAll = total.all ? 100 * (total.walk || 0) / total.all : null;
      total.l2w = l2w(total.lead, total.walk);
      const lines = [
        { id: 'ltWa', label: 'Linktree: WhatsApp outlet', v: total.ltWa, type: 'WhatsApp', src: 'Linktree' },
        { id: 'meta', label: 'Meta Ads: chat CTWA', v: ad && ad.hasMeta ? ad.metaChat.total : null, type: 'WhatsApp', src: 'Tracker Meta Ads' },
        { id: 'gbpChat', label: 'Google Business Profile: chat', v: ad && ad.hasGoogle ? ad.gbpChat.total : null, type: 'WhatsApp', src: 'Tracker Google Ads' },
        { id: 'waTotal', label: 'Jumlah klik WhatsApp outlet', v: total.wa, total: true },
        { id: 'adCall', label: 'Google Ads: call click', v: ad && ad.hasGoogle ? ad.adCalls.total : null, type: 'Call', src: 'Tracker Google Ads' },
        { id: 'gbpCall', label: 'Google Business Profile: call', v: ad && ad.hasGoogle ? ad.gbpCalls.total : null, type: 'Call', src: 'Tracker Google Ads' },
        { id: 'adDir', label: 'Google Ads: arah', v: ad && ad.hasGoogle ? ad.adDir.total : null, type: 'Arah', src: 'Tracker Google Ads' },
        { id: 'gbpDir', label: 'Google Business Profile: arah', v: ad && ad.hasGoogle ? ad.gbpDir.total : null, type: 'Arah', src: 'Tracker Google Ads' },
        { id: 'ltLoc', label: 'Linktree: lokasi', v: ltSum(lt, 'loc_'), type: 'Arah', src: 'Linktree' },
        { id: 'ltHq', label: 'Linktree: WhatsApp HQ', v: lt && (lt.wa_Online != null || lt.wa_Buyback != null) ? (lt.wa_Online || 0) + (lt.wa_Buyback || 0) : null, type: 'WhatsApp HQ', src: 'Linktree' },
      ];
      return { per, total, lines, adsLoaded: !!ds.ads, hasMeta: !!(ad && ad.hasMeta), hasGoogle: !!(ad && ad.hasGoogle) };
    };
    const cur = one(y, m), [py, pm] = prevYM(y, m), prev = one(py, pm);
    cur.lines.forEach((l, i) => { l.prev = prev.lines[i].v; l.mom = change(l.v, l.prev); });
    const trend = [3, 2, 1, 0].map(k => { const [yy, mm] = prevYM(y, m, k); const o = one(yy, mm); return { y: yy, m: mm, ...o.total }; });
    return { ...cur, trend };
  }

  // ---------- 6. Content ----------
  const FUNNEL_OF = { Educational: 'TOFU', Trend: 'TOFU', 'POV Customer': 'MOFU', Review: 'MOFU', Promo: 'BOFU' };
  const funnelOf = p => FUNNEL_OF[Object.keys(FUNNEL_OF).find(k => k.toLowerCase() === String(p.type || '').toLowerCase())] || (/pov/i.test(p.type) ? 'MOFU' : p.funnel || null);
  function content(posts, c) {
    if (!c || !c.total) return null;
    const views = c.views;
    // Funnel ikut TYPE (Peta seksyen 6): TOFU = Educational + Trend, MOFU = POV Customer + Review, BOFU = Promo
    const fn = {}; for (const f of ['TOFU', 'MOFU', 'BOFU']) fn[f] = { posts: 0, views: 0 };
    let unknown = 0;
    for (const p of posts) { const f = funnelOf(p); if (!f || !fn[f]) { unknown++; continue; } fn[f].posts++; fn[f].views += p.views || 0; }
    const funnel = Object.entries(fn).map(([k, v]) => ({ k, ...v, pctPosts: 100 * v.posts / c.total, pctViews: views ? 100 * v.views / views : null, avg: v.posts ? v.views / v.posts : null }));
    const sorted = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0));
    const med = (() => { const v = sorted.map(p => p.views || 0).reverse(); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; })();
    const grp = key => Object.entries(posts.reduce((o, p) => { const k = key(p) || '(kosong)'; (o[k] = o[k] || { posts: 0, views: 0 }); o[k].posts++; o[k].views += p.views || 0; return o; }, {}))
      .map(([k, v]) => ({ k, ...v, avg: v.views / v.posts, pctViews: views ? 100 * v.views / views : null })).sort((a, b) => b.views - a.views);
    return {
      total: c.total, views, avg: c.avg, median: med, funnel, funnelUnknown: unknown,
      byKategori: grp(p => p.kategori), byType: grp(p => p.type), byOutlet: grp(p => p.outlet), bySub: grp(p => p.sub),
      tiers: ['Diamond', 'Gold', 'Silver', 'Bronze'].map(t => ({ t, n: c.tiers[t] || 0 })),
      top: sorted.slice(0, 10), bottom: sorted.slice(-5).reverse(), strategicSource: { hq: posts.filter(p => p.outlet === 'HQ' && p.type && !/pov/i.test(p.type)).length, outlet: posts.filter(p => p.outlet !== 'HQ' && p.type && !/pov/i.test(p.type)).length },
    };
  }

  // ---------- 7. KPI Outlet (10 KPI × 4 outlet, halaman 4) ----------
  function outletKpi(ds, y, m, review) {
    const o = KD.outletStats(ds, y, m), L = leadMonth(ds, y, m), plan = KD.leadPlan(y, m), cp = calPace(y, m);
    const defs = [
      ['rawPhone', 'RAW Phone'], ['rawRepair', 'RAW Repair'], ['customer', 'Customer Image'], ['beforeAfter', 'Before / After'],
      ['googleReview', 'Google Review (kumulatif)'], ['wa', 'WhatsApp clicks'], ['location', 'Location clicks'],
      ['leads', 'Leads'], ['walkin', 'Walk-in'], ['conversion', 'Conversion (target 40%)'],
    ];
    const cell = (x, k) => {
      const tO = T.outlet[x];
      if (k === 'leads' || k === 'walkin') { const kind = k === 'leads' ? 'lead' : 'walkin'; return kpiRow({ actual: L.outlets[x][kind].total, target: plan ? plan.outlets[x][kind].total : null, pace: leadPace(ds, y, m, kind, 'total', x) }); }
      if (k === 'conversion') return kpiRow({ actual: l2w(L.outlets[x].lead.total, L.outlets[x].walkin.total), target: T.conversion, unit: '%' });
      if (k === 'googleReview') return kpiRow({ actual: review ? review[x] ?? null : null, target: tO.googleReview, pace: 1 });
      const na = tO[k] == null;
      return na ? { na: true, level: 'na' } : kpiRow({ actual: o.outlets[x][k], target: tO[k], pace: k === 'wa' || k === 'location' ? cp : cp });
    };
    const rows = defs.map(([k, label]) => {
      const cells = Object.fromEntries(OUT.map(x => [x, cell(x, k)]));
      let total = null;
      if (['rawPhone', 'rawRepair', 'wa', 'location', 'leads', 'walkin'].includes(k)) {
        const a = OUT.filter(x => !cells[x].na && cells[x].actual != null);
        const tgt = OUT.filter(x => !cells[x].na).reduce((s, x) => s + (cells[x].target || 0), 0);
        if (a.length) total = kpiRow({ actual: a.reduce((s, x) => s + cells[x].actual, 0), target: k === 'leads' && plan ? plan.company.lead.total : k === 'walkin' && plan ? plan.company.walkin.total : tgt, pace: cells[a[0]].pace });
      } else if (k === 'conversion') total = kpiRow({ actual: l2w(L.lead.total, L.walkin.total), target: T.conversion, unit: '%' });
      return { k, label, cells, total };
    });
    const score = Object.fromEntries(OUT.map(x => { const cs = rows.map(r => r.cells[x]).filter(c => !c.na); return [x, { hit: cs.filter(c => c.level === 'good').length, of: cs.length }]; }));
    return { rows, score };
  }

  // ---------- 8. Platform ----------
  function platform(ds, y, m) {
    const [py, pm] = prevYM(y, m), s = KD.social(ds, y, m), ps = KD.social(ds, py, pm);
    const row = (label, a, p, kind, invert) => ({ label, actual: a, prev: p, mom: change(a, p, kind), momGood: goodDir(change(a, p, kind), invert), kind });
    const g = (o, k) => o && o.days ? o[k] : null;
    const tt = s.tiktok, pt = ps.tiktok, fb = s.facebook, pf = ps.facebook, ig = s.instagram, pi = ps.instagram, yt = s.youtube, py2 = ps.youtube;
    const co = KD.company(ds, y, m), pco = KD.company(ds, py, pm);
    const lt = linktree(ds, y, m), plt = linktree(ds, py, pm);
    return {
      tiktok: { days: tt.days, rows: [row('View', g(tt, 'views'), g(pt, 'views')), row('Reach', g(tt, 'reach'), g(pt, 'reach')), row('Profile view', g(tt, 'profileViews'), g(pt, 'profileViews')),
        row('Likes', g(tt, 'likes'), g(pt, 'likes')), row('Comments', g(tt, 'comments'), g(pt, 'comments')), row('Shares', g(tt, 'shares'), g(pt, 'shares')),
        row('Website click', g(tt, 'websiteClicks'), g(pt, 'websiteClicks')), row('New follower', g(tt, 'newFollowers'), g(pt, 'newFollowers')),
        row('Lost follower', g(tt, 'lostFollowers'), g(pt, 'lostFollowers'), 'pct', true), row('Net follower', g(tt, 'netGrowth'), g(pt, 'netGrowth'), 'abs')] },
      youtube: { days: yt.days, rows: [row('View', g(yt, 'views'), g(py2, 'views')), row('Watch time (jam)', g(yt, 'watchHours'), g(py2, 'watchHours')), row('Impressions', g(yt, 'impressions'), g(py2, 'impressions')),
        { ...row('CTR', yt.days ? yt.ctr : null, py2.days ? py2.ctr : null, 'pt'), unit: '%' }, row('New subscriber', g(yt, 'newSubs'), g(py2, 'newSubs')),
        row('Lost subscriber', g(yt, 'lostSubs'), g(py2, 'lostSubs'), 'pct', true), row('Net subscriber', g(yt, 'netSubs'), g(py2, 'netSubs'), 'abs')] },
      facebook: { days: fb.days, rows: [row('View', g(fb, 'views'), g(pf, 'views')), row('Reach', g(fb, 'reach'), g(pf, 'reach')), row('Visit', g(fb, 'visit'), g(pf, 'visit')),
        row('Interactions', g(fb, 'interactions'), g(pf, 'interactions')), row('Follow', g(fb, 'follow'), g(pf, 'follow')), { ...row('Link click', g(fb, 'linkClick'), g(pf, 'linkClick')), days: fb.daysOf && fb.daysOf.linkClick }] },
      instagram: { days: ig.days, rows: [row('View', g(ig, 'views'), g(pi, 'views')), row('Reach', g(ig, 'reach'), g(pi, 'reach')), row('Visit', g(ig, 'visit'), g(pi, 'visit')),
        row('Interactions', g(ig, 'interactions'), g(pi, 'interactions')), row('Follow', g(ig, 'follow'), g(pi, 'follow')), { ...row('Link click', g(ig, 'linkClick'), g(pi, 'linkClick')), days: ig.daysOf && ig.daysOf.linkClick }] },
      dim: daysIn(y, m),
      allViews: kpiRow({ actual: co.views, target: T.allViews, prev: pco.views, pace: 1 }),
      share: co.plats.map(p => ({ id: p.id, name: p.name, views: p.views, pct: co.views && p.views != null ? 100 * p.views / co.views : null })),
      linktree: {
        profile: kpiRow({ actual: g(tt, 'profileViews'), target: T.profileViews, prev: g(pt, 'profileViews') }),
        views: lt ? lt.ltViews ?? null : null, prevViews: plt ? plt.ltViews ?? null : null,
        ctrProfile: kpiRow({ actual: ctrProfile(ds, y, m), target: T.ctrProfile, prev: ctrProfile(ds, py, pm), unit: '%' }),
        unique: kpiRow({ actual: lt ? lt.uniqueClicks ?? null : null, target: T.uniqueLinktree, prev: plt ? plt.uniqueClicks ?? null : null }),
        uniqueClick: lt ? lt.uniqueClick ?? null : null,
        ctrAction: kpiRow({ actual: ctrAction(lt), target: T.ctrAction, prev: ctrAction(plt), unit: '%' }),
        clicks: [
          ['Lokasi (4 outlet)', ltSum(lt, 'loc_'), ltSum(plt, 'loc_'), OUT.reduce((a, x) => a + T.outlet[x].location, 0)],
          ['Telegram', lt && lt.telegram, plt && plt.telegram, T.telegram],
          ['Canva Site', lt && lt.canva, plt && plt.canva, null],
          ...OUT.map(x => ['WhatsApp ' + CFG.outletNames[x].replace('Kulim / Kelang Lama', 'Kulim'), lt && lt['wa_' + x], plt && plt['wa_' + x], T.outlet[x].wa, x]),
          ['WhatsApp Online Postage', lt && lt.wa_Online, plt && plt.wa_Online, null, 'HQon'],
          ['WhatsApp Buyback', lt && lt.wa_Buyback, plt && plt.wa_Buyback, null, 'HQbb'],
        ].map(([label, a, p, t, key]) => ({ label, key, ...kpiRow({ actual: a ?? null, target: t, prev: p ?? null }) })),
      },
    };
  }

  // ---------- 9. Iklan (tanpa RM) ----------
  function ads(ds, y, m) {
    const cur = adsMonth(ds, y, m);
    const trend = [5, 4, 3, 2, 1, 0].map(k => { const [yy, mm] = prevYM(y, m, k); const a = adsMonth(ds, yy, mm); return { y: yy, m: mm, metaChat: a && a.hasMeta ? a.metaChat.total : null, metaLink: a && a.hasMeta ? a.metaLink.total : null, gClicks: a && a.hasGoogle ? a.gClicks.total : null, adCalls: a && a.hasGoogle ? a.adCalls.total : null, adDir: a && a.hasGoogle ? a.adDir.total : null, gbpChat: a && a.hasGoogle ? a.gbpChat.total : null, gbpCalls: a && a.hasGoogle ? a.gbpCalls.total : null, gbpDir: a && a.hasGoogle ? a.gbpDir.total : null }; });
    return { loaded: !!ds.ads, cur, trend };
  }

  // ---------- 10. Dapatan automatik (Tindakan disahkan Hafiz dalam laporan) ----------
  function findings(sc) {
    const withAch = sc.rows.filter(r => r.ach != null && r.level !== 'na');
    const worst = [...withAch].sort((a, b) => a.ach - b.ach).slice(0, 4);
    const best = [...withAch].filter(r => r.level === 'good').sort((a, b) => b.ach - a.ach).slice(0, 3);
    const movers = sc.rows.filter(r => r.mom && r.mom.kind === 'pct' && Math.abs(r.mom.v) >= 20 && r.actual != null).sort((a, b) => Math.abs(b.mom.v) - Math.abs(a.mom.v)).slice(0, 3);
    return { worst, best, movers };
  }

  const API = { OUT, CATS, CAT_LABEL, isLive, calPace, levelOf, change, kpiRow, leadMonth, scorecard, leadCompany, leadOutlets, monthly, sources, adsMonth, content, outletKpi, platform, ads, findings, ctrProfile, ctrAction, funnelOf };
  root.KR = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
