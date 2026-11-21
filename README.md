# KLIKI Laporan Marketing

Web app (PWA) **terperinci** untuk Laporan Marketing Bulanan KLIKI. Asing daripada [KLIKI Marketing Dashboard](https://klikidotmy.github.io/kliki-marketing-dashboard) yang kekal sebagai paparan ringkas harian. **Metrik, cara kira dan susunan tab sama dengan Laporan Marketing Bulanan**, supaya angka dashboard dan laporan sentiasa sepadan. Data dibaca terus dari Google Sheet setiap kali app dibuka; tiada data disimpan dalam repo.

Rujukan cara kira: *Peta Sumber Data Laporan Bulanan.md* (Drive Hafiz), seksyen 4 (peraturan) dan 6 (sasaran KPI).

## Tab (ikut laporan)

| Kumpulan | Tab | Halaman laporan |
|---|---|---|
| Bulan ini | Ringkasan · Scorecard KPI (33 KPI) | Kulit/YTD, Ringkasan Eksekutif, Scorecard |
| Lead & Walk-in | Company & Q4 · Outlet · Trend · Sumber | Overview + Kumulatif Q4, KPI Outlet, Perbandingan outlet, Trend, Sumber klik |
| Content & Platform | Content · Platform & Traffic · Iklan | Content Output/View/Outlet, Platform, Trend platform, Iklan |
| Drill-down | Setiap outlet · Dapatan | Halaman outlet, Key Finding |

## Sumber data

| Sheet | Untuk |
|---|---|
| CONTENT SUBMIT | Tab Tiktok, Facebook, Instagram, Youtube (dulu "… Insight", dibaca ikut gid), Threads & Telegram (mula Okt 2026, dibaca ikut nama tab), Supply Video V2, Customer, Before/After |
| REPORT CONTENT DATA | Tab bulan (per-post) + panel pemarkahan (Google Review kumulatif), LINKTREE |
| KLIKI Lead Walk-in Mirror (masterFRONT) | Lead & walk-in Phone/Repair/CC/Others ikut outlet, HQ |
| KLIKI Iklan Mirror (tanpa RM) | IMPORTRANGE kolum bukan-RM dari Tracker Meta Ads (CTWA) & Tracker Google Ads (Raxbit) |

Semua sheet di atas mesti dikongsi **Anyone with the link → Viewer**. Tracker iklan asal (ada RM) dan MASTER SHEET asal tidak dibaca terus kerana repo & site ini public.

## Peraturan kiraan (sama dengan laporan)

- Lead & walk-in: **Phone + Repair + CC** sahaja, 4 outlet, ikut Plan Sales (Kliki Marketing Brief; `targets.leadPlan` dalam `js/config.js`, angka total outlet ikut brief). HQ (Online Postage, Buyback) dan Others diasingkan, tidak masuk Total.
- Bahagian Lead/Walk-in tidak dicampur dengan content atau view.
- Warna Ach: ≥100% hijau, 80–99% kuning, <80% merah, ikut nilai dibundar (1 titik perpuluhan). Bulan berjalan: warna ikut kadar hari (hari operasi outlet untuk lead/walk-in), tanpa pengecualian "sedang naik".
- MoM: % untuk kiraan, **pt** untuk CTR/conversion, beza mutlak untuk net follower. ▲▼ hijau = baik; lost follower / lost subscriber / kos: turun = hijau. Lead-to-walk-in tidak diwarnakan.
- Bucket view: iPhone / Android = sub kategori itu **kecuali kategori Repair**; Repair = kategori Repair (sasaran 100k); Trade-in / C&C = Trade-in + Buyback. Tidak dijumlahkan.
- Total view semua platform = TikTok + FB + IG + YouTube (sasaran 6M). Threads & Telegram dipapar dalam tab Platform tetapi **tidak** masuk jumlah ini (`extraInTotal: false` dalam `js/config.js`). Followers Threads/Telegram = jumlah hujung bulan; engagement Telegram = Shares + Reactions.
- CTR Profile → Linktree = Linktree total view ÷ TikTok profile visit (tab **Tiktok**) × 100. Action CTR = unique click ÷ unique view × 100.
- CTR YouTube bulanan = purata biasa CTR harian.
- Funnel content ikut TYPE: TOFU = Educational + Trend, MOFU = POV Customer + Review, BOFU = Promo.
- Klik WhatsApp (tab Sumber) = Linktree + Meta CTWA chat + GBP chat. Call = Google Ads call + GBP call. Arah = Google Ads + GBP + Linktree lokasi.
- Sel kosong = tiada data (bukan 0).

## Kod

```
js/config.js   ID sheet, gid tab, semua sasaran
js/data.js     fetch CSV + parse (Insight, per-post, LINKTREE, Mirror lead, panel Google Review, Iklan Mirror)
js/report.js   enjin KPI ikut laporan (scorecard, lead, Q4/YTD, outlet, trend, sumber, content, platform, iklan)
js/app.js      paparan sahaja
test/golden-okt2026.js  ujian: angka Okt 2026 mesti sama dengan laporan muktamad
```

### Ujian golden
Buka dashboard, kemudian dalam console browser: muat `test/golden-okt2026.js` dan jalankan `await KLIKI_GOLDEN()`. Semua mesti `fail: 0`. Ujian halaman Sumber di-skip jika Iklan Mirror belum boleh dibaca.

## Tukar target / bulan baru
Semua dalam `js/config.js`: `targets` (KPI Marketing), `targets.leadPlan.months['YYYY-MM']` (Plan Sales `[phone, repair, cc, total]`), `monthTabs` (gid tab per-post; bulan tanpa gid dicari ikut nama tab `NOV'26`, `DIS'26`).

## Pasang di phone
iPhone (Safari): Share → *Add to Home Screen*. Android (Chrome): ⋮ → *Install app*.
