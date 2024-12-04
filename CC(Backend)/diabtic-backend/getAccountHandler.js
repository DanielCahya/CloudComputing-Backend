const jwt = require("jsonwebtoken");
const { Firestore } = require("@google-cloud/firestore");

// Inisialisasi Firestore
const db = new Firestore();

const getAccountHandler = async (req, res) => {
  const authHeader = req.headers.authorization;

  // Validasi header Authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Token tidak ditemukan atau tidak valid.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verifikasi JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const { username } = decoded;  // Extract username langsung dari decoded token

    // Ambil data pengguna dari Firestore
    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();

    // Cek apakah pengguna ada
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    const userData = userDoc.data();

    // Respons dengan data pengguna
    return res.status(200).json({
      success: true,
      message: "Data pengguna berhasil diambil.",
      data: {
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        profilePicture: userData.profilePicture || null, // Menyediakan nilai default null untuk profil picture
        createdAt: userData.createdAt ? userData.createdAt.toDate() : null, // Pastikan timestamp valid
      },
    });
  } catch (error) {
    console.error("Error pada /account:", error);

    // Jika kesalahan terkait token
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau telah kedaluwarsa.",
      });
    }

    // Tangani kesalahan lainnya
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data pengguna.",
    });
  }
};

module.exports = getAccountHandler;
