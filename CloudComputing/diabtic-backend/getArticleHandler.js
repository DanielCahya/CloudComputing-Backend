const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore();

// Fungsi untuk mengambil artikel dari Firestore berdasarkan ID atau mengambil semua artikel
const getArticleHandler = async (req, res) => {
  try {
    const { id } = req.params;  // Mendapatkan ID artikel dari URL params

    // Jika id diberikan, ambil artikel berdasarkan ID tersebut
    if (id) {
      const articleRef = firestore.collection('articles').doc(id);
      const articleDoc = await articleRef.get();

      // Jika artikel tidak ditemukan
      if (!articleDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Artikel tidak ditemukan.',
        });
      }

      // Mengembalikan data artikel
      return res.status(200).json({
        success: true,
        data: {
          id: articleDoc.id,
          ...articleDoc.data(),
        },
      });
    }

    // Jika tidak ada ID, ambil semua artikel
    const articlesSnapshot = await firestore.collection('articles').get();

    // Jika tidak ada artikel
    if (articlesSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada artikel ditemukan.',
      });
    }

    // Ambil data dari semua artikel
    const articles = articlesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Mengembalikan daftar artikel
    return res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error('Error mengambil artikel: ', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal mengambil artikel.',
    });
  }
};

module.exports = getArticleHandler;