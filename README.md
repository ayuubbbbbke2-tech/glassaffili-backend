# GlassAffili AI Backend

Website + backend Node.js untuk mengirim job video ke Replicate.

## Jalankan lokal
1. Install Node.js 20+
2. `npm install`
3. Salin `.env.example` menjadi `.env`
4. Isi `REPLICATE_API_TOKEN` di server, BUKAN di HTML.
5. `npm start`
6. Buka `http://localhost:3000`

## Deploy
Cocok untuk server Node seperti Render, Railway, Fly.io, VPS, atau layanan sejenis.
Set environment variable:
- REPLICATE_API_TOKEN
- VIDEO_MODEL=wan-video/wan-2.2-i2v-a14b
- PORT (opsional)

## Catatan
Versi ini adalah fondasi backend. Input gambar produk harus berupa URL yang dapat diakses server. Untuk produksi, tambahkan:
- product-link resolver/API resmi marketplace
- persistent database
- object storage untuk hasil video
- webhook Replicate
- queue/worker
- auth pengguna
- scene pipeline 5–8 klip + voice-over + subtitle + final render
