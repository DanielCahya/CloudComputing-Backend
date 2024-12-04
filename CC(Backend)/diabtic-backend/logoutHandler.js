const { Firestore } = require('@google-cloud/firestore');

// Inisialisasi Firestore client
const firestore = new Firestore();

const logoutHandler = async (req, res) => {
  const { username } = req.body;

  // Validasi input
  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username diperlukan.",
    });
  }

  try {
    // Cari pengguna berdasarkan username
    const userRef = firestore.collection("users").doc(username);
    const userDoc = await userRef.get();

    // Cek apakah pengguna ada
    if (!userDoc.exists) {
      return res.status(400).json({
        success: false,
        message: "Username tidak ditemukan.",
      });
    }

    // Hapus refresh token pengguna
    await userRef.update({
      refreshToken: Firestore.FieldValue.delete(),
    });

    // Respons sukses
    return res.status(200).json({
      success: true,
      message: "Anda telah logout.",
    });
  } catch (error) {
    console.error("Error logout:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal logout. Silakan coba lagi nanti.",
      error: error.message || "Internal server error",
    });
  }
};

module.exports = logoutHandler;
