---
name: stickman-visual
description: Buat animasi stickman visual-only (tanpa text, caption, atau tulisan) dengan Remotion. Gunakan saat user minta ilustrasi stickman yang nanti diselaraskan dengan audio narasi. Fokus pada gerakan dinamis dan timing yang mudah di-sync.
---

# Stickman Visual Only (Remotion)

Buat video stickman murni visual. Tidak boleh ada text, caption, judul, subtitle, atau tulisan apa pun di layar. Video ini nantinya akan diselaraskan dengan audio narasi yang di-attach belakangan.

## Aturan wajib

1. **Tidak ada text sama sekali** — tidak ada `<text>`, caption, label, atau tulisan.
2. **Kaki wajib bergerak** — walkCycle saat berjalan, idleSway saat diam.
3. **Semua interpolate harus di-clamp**.
4. **Pakai spring** untuk gesture, pop-in objek, dan transisi.
5. **Deterministic** — pakai `random(seed)` dari Remotion.
6. **Durasi per scene** harus jelas dan mudah diubah agar bisa di-sync dengan audio.

## Struktur yang disarankan

- `timeline.ts` berisi daftar scene dengan `from` dan `durationInFrames` yang mudah diedit.
- Setiap scene punya nama yang jelas (misal: `intro`, `point1`, `point2`, `outro`).
- Stickman + props sederhana saja (panah, kotak, objek visual).

## Pose yang harus tersedia

- idle, walk, point, think, explain (tangan lebar), nod, celebrate

## Output

- Format 16:9 atau 9:16 sesuai permintaan.
- Background sederhana.
- Gerakan harus jelas dan bisa dibaca tanpa teks.

## Setelah selesai

Berikan timeline dalam detik agar user mudah menyesuaikan dengan audio narasi nanti.
