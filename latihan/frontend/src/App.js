import React, { useState, useEffect } from 'react';
import DaftarPengguna from './components/DaftarPengguna';

const App = () => {
  const [pengguna, setPengguna] = useState([]);
  const [memuat, setMemuat] = useState(false);

  const ambilPengguna = async () => {
    setMemuat(true);

    const cache = localStorage.getItem('penggunaCache');
    if (cache) {
      setPengguna(JSON.parse(cache));
      setMemuat(false);
      return;
    }

    try {
      const respon = await fetch('http://localhost:3000/api/pengguna?jumlah=100');
      const data = await respon.json();

      const pekerja = new Worker('worker.js');
      pekerja.postMessage(data);

      pekerja.onmessage = (e) => {
        localStorage.setItem('penggunaCache', JSON.stringify(e.data));
        setPengguna(e.data);
        setMemuat(false);
      };
    } catch (err) {
      console.error('Gagal mengambil data:', err);
      setMemuat(false);
    }
  };

  useEffect(() => {
    ambilPengguna();
}, []);  // Perhatikan koma yang benar (gunakan , bukan ，)

return (
  <div style={{ padding: '20px' }}>
      <h1>Eksplorasi Pengguna (Umur &gt; 30)</h1>
      {memuat ? <p>Sedang memuat...</p> : <DaftarPengguna pengguna={pengguna} />}
  </div>
);
};

export default App;