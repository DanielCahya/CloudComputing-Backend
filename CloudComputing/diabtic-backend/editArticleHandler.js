const { Firestore } = require('@google-cloud/firestore');
const jwt = require('jsonwebtoken');

// Inisialisasi Firestore
const firestore = new Firestore();

// Fungsi untuk verifikasi token JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (error) {
    throw new Error('Token tidak valid atau telah kedaluwarsa.');
  }
};

// Handler untuk mengedit artikel berdasarkan ID
const editArticleHandler = async (req, res) => {
  const authHeader = req.headers.authorization;

  // Validasi token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Token tidak ditemukan.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verifikasi token
    verifyToken(token);

    // Ambil ID artikel dari parameter
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID artikel harus disertakan.",
      });
    }

    // Ambil data untuk diperbarui dari body
    const { title, description, image, author } = req.body;

    // Validasi data input
    if (!title && !description && !image && !author) {
      return res.status(400).json({
        success: false,
        message: "Minimal satu field (title, description, image, author) harus disertakan untuk diperbarui.",
      });
    }

    // Referensi ke dokumen artikel berdasarkan ID
    const articleRef = firestore.collection('articles').doc(id);

    // Periksa apakah artikel ada
    const articleSnapshot = await articleRef.get();
    if (!articleSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Artikel dengan ID tersebut tidak ditemukan.",
      });
    }

    // Data yang akan diperbarui
    const updatedData = {};
    if (title) updatedData.title = title;
    if (description) updatedData.description = description.split('\n').join('<br/>'); // Format deskripsi ke HTML
    if (image) updatedData.image = image;
    if (author) updatedData.author = author;

    updatedData.updatedDate = Firestore.Timestamp.now(); // Tambahkan timestamp waktu update

    // Perbarui artikel di Firestore
    await articleRef.update(updatedData);

    // Respons sukses
    return res.status(200).json({
      success: true,
      message: "Artikel berhasil diperbarui.",
      data: {
        id,
        ...updatedData,
      },
    });
  } catch (error) {
    console.error('Error mengedit artikel:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal memperbarui artikel.",
    });
  }
};

module.exports = editArticleHandler;