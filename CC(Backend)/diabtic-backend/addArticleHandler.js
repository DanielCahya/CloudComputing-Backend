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

// Handler untuk menambahkan artikel (POST)
const addArticleHandler = async (req, res) => {
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

    // Ambil data artikel dari request body
    const { title, description, image, author } = req.body;

    if (!title || !description || !image || !author) {
      return res.status(400).json({
        success: false,
        message: "Judul, deskripsi, gambar, dan author harus disertakan.",
      });
    }

    // Pastikan description berisi banyak paragraf yang dipisahkan dengan \n
    const formattedDescription = description.split('\n').join('<br/>'); // Bisa gunakan <br> jika ingin merender HTML

    // Referensi ke koleksi "articles"
    const articleRef = firestore.collection('articles');

    // Data artikel yang akan ditambahkan
    const newArticle = {
      title,
      description: formattedDescription, // Menyimpan dengan format HTML atau string paragraf
      image,
      createdDate: Firestore.Timestamp.now(), // Gunakan timestamp sekarang
      author, // Author dimasukkan secara manual dari body
    };

    // Tambahkan artikel baru
    const docRef = await articleRef.add(newArticle);

    // Respons sukses
    return res.status(201).json({
      success: true,
      message: "Artikel berhasil ditambahkan.",
      data: { id: docRef.id, ...newArticle },
    });
  } catch (error) {
    console.error('Error menambahkan artikel:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal menambahkan artikel.",
    });
  }
};

module.exports = addArticleHandler;
