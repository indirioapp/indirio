# Indirio Kod Tabanı

Bu depo, [indirio.com.tr](https://indirio.com.tr) web sitesinin Next.js kaynak kodlarını içerir.

## Mimari

Proje, arayüzü, arka plan görevlerini ve indirme işlemlerini yöneten tek bir Next.js uygulaması olarak yapılandırılmıştır:

- **Arayüz (Frontend)**: React, Tailwind CSS ve Framer Motion ile geliştirilmiş duyarlı arayüz.
- **Arka Plan API**: Next.js App Router API uç noktaları (`/api/analyze`, `/api/download`, `/api/stats`).
- **Çekirdek Motor**: Medya akışlarını işlemek için `yt-dlp` ve `ffmpeg` entegrasyonu.
- **Veri ve Kuyruk**: Bellek içi (in-memory) görev kuyruğu ve IP tabanlı istek sınırlama.

## Gereksinimler

- Node.js 18+
- yt-dlp
- FFmpeg

## Lisans

MIT Lisansı.
