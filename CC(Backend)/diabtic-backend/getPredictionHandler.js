const { Firestore } = require("@google-cloud/firestore");
const jwt = require("jsonwebtoken");

// Inisialisasi Firestore client
const firestore = new Firestore();

const getPredictionHandler = async (req, res) => {
  const authHeader = req.headers.authorization;

  // Verifikasi apakah header Authorization ada dan valid
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Token tidak ditemukan.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verifikasi token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const username = decoded.username;

    // Ambil data pengguna dari Firestore
    const userRef = firestore.collection("users").doc(username);
    const userDoc = await userRef.get();

    // Cek apakah dokumen pengguna ada
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    const userData = userDoc.data();
    const predictions = userData.predictions || [];

    // Cek apakah ada riwayat prediksi
    if (predictions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada riwayat prediksi ditemukan.",
      });
    }

    // Respons dengan data prediksi
    return res.status(200).json({
      success: true,
      message: "Riwayat prediksi berhasil diambil.",
      data: predictions,
    });
  } catch (error) {
    console.error("Error saat mendapatkan prediksi: ", error);

    // Menangani kesalahan terkait token JWT secara spesifik
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau telah kedaluwarsa.",
      });
    }

    // Tangani kesalahan lainnya
    return res.status(500).json({
      success: false,
      message: "Kesalahan saat mengambil data prediksi.",
    });
  }
};

module.exports = getPredictionHandler;
