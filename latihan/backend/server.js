const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Fungsi untuk membuat data dummy
const buatPengguna = (id) => ({
  id,
  nama: `Pengguna ${id}`,
  email: `pengguna${id}@gmail.com`,
  umur: Math.floor(Math.random() * 50) + 18
});

// Endpoint untuk mengambil daftar pengguna
app.get('/api/pengguna', async (req, res) => {
  const jumlah = parseInt(req.query.jumlah) || 50;

  const janji = Array.from({ length: jumlah }, (_, i) =>
    new Promise((selesai) => {
      setTimeout(() => selesai(buatPengguna(i + 1)), 5);
    })
  );
  const daftarPengguna = await Promise.all(janji);
  res.json(daftarPengguna);
});

app.listen(3000, () => console.log('Server berjalan di http://localhost:3000'));