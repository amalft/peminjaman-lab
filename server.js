const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Database Sementara (In-Memory)
let daftarPeminjaman = [];

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.CREDENTIALS_JSON || '{}'),
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const CALENDAR_IKHWAN = 'f183376d659fb8458ede0d231f42e35967df05a9fe412303233fad90496b65f5@group.calendar.google.com';
const CALENDAR_AKHWAT = '35888b0ee4802cf0347c2dc46d290dfa35b3360cbfd6b36e690958ed0331158f@group.calendar.google.com';

// Route Navigasi Halaman
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/kalender', (req, res) => res.sendFile(path.join(__dirname, 'public', 'kalender.html')));

// API User Kirim Pengajuan
app.post('/api/peminjaman', (req, res) => {
  const data = {
    id: Date.now().toString(),
    ...req.body,
    statusAdmin: 'Pending',
    statusKembali: 'BELUM DIKEMBALIKAN'
  };
  daftarPeminjaman.push(data);
  res.json({ success: true, message: "Pengajuan berhasil dikirim!" });
});

// API Admin Ambil Data
app.get('/api/peminjaman', (req, res) => {
  res.json(daftarPeminjaman);
});

// API Admin ACC & Sync ke Google Calendar
app.post('/api/peminjaman/approve/:id', async (req, res) => {
  try {
    const item = daftarPeminjaman.find(p => p.id === req.params.id);
    if (!item) return res.status(404).json({ message: "Data tidak ditemukan" });

    const calendar = google.calendar({ version: 'v3', auth });
    const targetCalendarId = item.bagian === 'AKHWAT' ? CALENDAR_AKHWAT : CALENDAR_IKHWAN;

    const startDateTime = new Date(`${item.tanggal}T${item.jamMulai}:00`);
    const endDateTime = new Date(`${item.tanggal}T${item.jamSelesai}:00`);

    const event = {
      summary: `[⏳ BELUM DIKEMBALIKAN] Pinjam ${item.barang} - ${item.nama}`,
      description: `Peminjam: ${item.nama} (${item.jabatan})\nBarang: ${item.barang}\nMapel: ${item.mataPelajaran || '-'}\nTujuan: ${item.tujuan || '-'}`,
      start: { dateTime: startDateTime.toISOString() },
      end: { dateTime: endDateTime.toISOString() },
    };

    await calendar.events.insert({
      calendarId: targetCalendarId,
      resource: event,
    });

    item.statusAdmin = 'Disetujui';
    res.json({ success: true });
  } catch (error) {
    console.error("Error Calendar API:", error);
    res.status(500).json({ message: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));