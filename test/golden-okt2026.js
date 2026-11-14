// Ujian golden: angka Oktober 2026 dari enjin dashboard MESTI sama dengan Laporan Marketing Oktober 2026 (versi muktamad).
// Jalankan dalam browser selepas app dimuat: await KLIKI_GOLDEN()  → { pass, fail, skipped, results }
(function (root) {
  root.KLIKI_GOLDEN = async function () {
    const KD = root.KD, KR = root.KR;
    const ds = await KD.loadAll(() => {});
    const P = await KD.loadMonthPosts(ds, 2026, 10), PP = await KD.loadMonthPosts(ds, 2026, 9);
    const c = KD.contentStats(P.posts), pc = KD.contentStats(PP.posts);
    const sc = KR.scorecard(ds, 2026, 10, c, pc);
    const R = id => sc.rows.find(r => r.id === id);
    const lc = KR.leadCompany(ds, 2026, 10), ok = KR.outletKpi(ds, 2026, 10, P.googleReview), pl = KR.platform(ds, 2026, 10), src = KR.sources(ds, 2026, 10);
    const ct = KR.content(P.posts, c);
    const out = [];
    const r1 = x => x == null ? null : Math.round(x * 10) / 10, r2 = x => x == null ? null : Math.round(x * 100) / 100;
    const eq = (name, got, want, skip) => out.push({ name, got, want, ok: skip ? null : got === want });
    // Scorecard (halaman 3 + 11)
    [['totalContent', 42], ['pov', 25], ['strategic', 17], ['type_Educational', 11], ['type_Trend', 3], ['type_Review', 0], ['type_Promo', 3],
     ['subj_Buyback', 5], ['subj_Repair', 3], ['subj_Trade-in', 3], ['subj_Phone', 6], ['postViews', 1095454], ['ttViews', 3136368], ['allViews', 4091590],
     ['bucket_iPhone', 872763], ['bucket_Android', 114684], ['bucket_Repair', 108007], ['bucket_Trade-in / CC', 527537],
     ['likes', 77488], ['comments', 1225], ['shares', 4125], ['profileViews', 46112], ['newFollowers', 6439], ['netGrowth', -5617],
     ['uniqueView', 6147], ['telegram', 1931], ['wa', 3819], ['location', 464], ['leads', 1247], ['walkin', 775]].forEach(([id, v]) => eq('Actual ' + id, R(id).actual, v));
    eq('CTR Profile→Linktree', r1(R('ctrProfile').actual), 19.9); eq('Linktree Action CTR', r1(R('ctrAction').actual), 71.0); eq('Conversion', r1(R('conversion').actual), 62.1);
    eq('Ach Repair view (target 100k)', r1(R('bucket_Repair').ach), 108.0);
    [['totalContent', 7.7], ['postViews', -6.3], ['ttViews', -17.9], ['allViews', -14.2], ['bucket_iPhone', 1.6], ['bucket_Android', -60.5], ['bucket_Repair', 451.8], ['bucket_Trade-in / CC', 1056.3], ['leads', -16.5], ['walkin', 15.2], ['uniqueView', -4.7], ['wa', 28.8]]
      .forEach(([id, v]) => eq('MoM % ' + id, r1(R(id).mom && R(id).mom.v), v));
    eq('MoM pt CTR profile', r2(R('ctrProfile').mom.v), 1.60); eq('MoM pt Action CTR', r2(R('ctrAction').mom.v), 4.69); eq('MoM pt Conversion', r2(R('conversion').mom.v), 17.10); eq('MoM net followers (mutlak)', R('netGrowth').mom.v, 34);
    eq('KPI capai (hijau)', sc.good, 8); eq('KPI hampir (kuning)', sc.warn, 3); eq('KPI bawah 80% (merah)', sc.bad, 22); eq('Jumlah KPI', sc.total, 33);
    // Lead & walk-in (halaman 5)
    const L = id => lc.rows.find(r => r.id === id);
    [['phone', 837, 1453, 320, 436, 38.2], ['repair', 258, 816, 389, 449, 150.8], ['cc', 152, 311, 66, 118, 43.4], ['total', 1247, 2580, 775, 1003, 62.1]].forEach(([id, la, lt, wa, wt, l2]) => {
      eq(`Lead ${id}`, L(id).lead.actual, la); eq(`Plan lead ${id}`, L(id).lead.target, lt); eq(`Walk-in ${id}`, L(id).walkin.actual, wa); eq(`Plan walk-in ${id}`, L(id).walkin.target, wt); eq(`Lead-to-walk-in ${id}`, r1(L(id).l2w), l2);
    });
    eq('Conversion Sep', r1(lc.convPrev), 45.0); eq('Conversion Okt 2025', r1(lc.convLY), 34.4);
    eq('HQ Online Postage', lc.segments.hqOnline, 120); eq('HQ Buyback', lc.segments.hqBuyback, 18); eq('Others lead', lc.segments.othersLead, 81); eq('Others walk-in', lc.segments.othersWalk, 308);
    eq('Plan penuh Q4 lead', lc.quarter.fullLead, 7601); eq('Plan penuh Q4 walk-in', lc.quarter.fullWalk, 2954); eq('% Plan Q4 lead', r1(lc.quarter.pctLead), 16.4); eq('% Plan Q4 walk-in', r1(lc.quarter.pctWalk), 26.2);
    // KPI outlet (halaman 4)
    eq('Google Review KUL/AOR/SP/PDG', ['KUL', 'AOR', 'SP', 'PDG'].map(x => P.googleReview && P.googleReview[x]).join('/'), '20/33/12/8');
    eq('Skor KPI outlet KUL/AOR/SP/PDG', ['KUL', 'AOR', 'SP', 'PDG'].map(x => ok.score[x].hit + '/' + ok.score[x].of).join(' '), '3/10 6/10 2/10 2/8');
    // Content (halaman 11)
    eq('Funnel TOFU/MOFU/BOFU post', ct.funnel.map(f => f.posts).join('/'), '14/25/3'); eq('Funnel view MOFU', ct.funnel[1].views, 1024643);
    // Platform (halaman 14)
    eq('CTR YouTube (purata biasa)', r2(pl.youtube.rows[3].actual), 6.55); eq('Linktree view', pl.linktree.views, 9181); eq('Share TikTok %', r1(pl.share[0].pct), 76.7);
    eq('Lost follower turun = hijau', pl.tiktok.rows[8].momGood, true);
    // Sumber (halaman 10) — perlu sheet Iklan Mirror
    const skip = !src.hasMeta || !src.hasGoogle;
    eq('Klik WhatsApp semua sumber', src.total.wa, 4094, skip); eq('Call ke outlet', src.total.call, 377, skip); eq('Klik arah', src.total.dir, 1813, skip); eq('Semua tindakan', src.total.all, 6284, skip);
    eq('Lead ÷ klik', r1(src.total.leadPerClick), 30.5, skip); eq('Walk-in ÷ semua', r1(src.total.walkPerAll), 12.3, skip); eq('Klik WA Alor Setar', src.per.AOR.wa, 1346, skip);
    const res = { pass: out.filter(r => r.ok === true).length, fail: out.filter(r => r.ok === false).length, skipped: out.filter(r => r.ok === null).length, failures: out.filter(r => r.ok === false), skippedNames: out.filter(r => r.ok === null).map(r => r.name) };
    return res;
  };
})(typeof window !== 'undefined' ? window : globalThis);
