import React from 'react';

const DaftarPengguna = ({ pengguna }) => {
  return (
    <ul>
      {pengguna.map((p) => (
        <li key={p.id}>{p.nama} - {p.umur} tahun</li>
      ))}
    </ul>
  );
};

export default DaftarPengguna;