self.onmessage = function (pesan) {
    const pengguna = pesan.data;
    const hasil = pengguna.filter((p) => p.umur > 30);
    self.postMessage(hasil);
  };