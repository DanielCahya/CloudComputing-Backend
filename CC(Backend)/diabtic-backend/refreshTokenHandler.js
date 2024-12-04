const jwt = require("jsonwebtoken");
const { Firestore } = require('@google-cloud/firestore');

// Inisialisasi Firestore client
const firestore = new Firestore();

const refreshTokenHandler = async (req, res) => {
  const { refreshToken } = req.body;

  // Validasi apakah refresh token ada
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token diperlukan.",
    });
  }

  try {
    // Verifikasi Refresh Token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);
    const { username } = decoded;  // Ambil username dari payload

    // Cari pengguna berdasarkan username dan pastikan refresh token valid
    const userRef = firestore.collection("users").doc(username);
    const userDoc = await userRef.get();

    // Cek apakah pengguna ada dan token yang disimpan cocok
    if (!userDoc.exists || userDoc.data().refreshToken !== refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    // Generate JWT Access Token baru
    const accessToken = jwt.sign(
      { username },  // Username sudah cukup sebagai payload
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Respons sukses dengan access token baru
    return res.status(200).json({
      success: true,
      message: "Token refresh berhasil.",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    console.error("Error refresh token: ", error);

    // Tangani kesalahan spesifik
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    // Tangani kesalahan lainnya
    return res.status(500).json({
      success: false,
      message: "Gagal melakukan refresh token.",
    });
  }
};

module.exports = refreshTokenHandler;
