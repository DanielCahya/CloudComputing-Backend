const { Firestore } = require("@google-cloud/firestore");
const bcrypt = require("bcryptjs");

// Inisialisasi Firestore client
const firestore = new Firestore();

const registerHandler = async (req, res) => {
  const { username, email, phone, password } = req.body;

  // Validasi input
  if (!username || !email || !phone || !password) {
    return res.status(400).json({
      success: false,
      message: "Lengkapi semua data.",
    });
  }

  try {
    // Batch untuk memproses beberapa query di Firestore dalam satu transaksi
    const batch = firestore.batch();

    // Cek apakah username, email, atau phone sudah terdaftar
    const userRefByUsername = firestore.collection("users").doc(username);
    const docByUsername = await userRefByUsername.get();
    if (docByUsername.exists) {
      return res.status(400).json({
        success: false,
        message: "Username sudah terdaftar.",
      });
    }

    const userRefByEmail = firestore.collection("users").where("email", "==", email);
    const snapshotByEmail = await userRefByEmail.get();
    if (!snapshotByEmail.empty) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar.",
      });
    }

    const userRefByPhone = firestore.collection("users").where("phone", "==", phone);
    const snapshotByPhone = await userRefByPhone.get();
    if (!snapshotByPhone.empty) {
      return res.status(400).json({
        success: false,
        message: "Nomor HP sudah terdaftar.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Siapkan data pengguna
    const userData = {
      username,
      email,
      phone,
      password: hashedPassword,
      profilePicture: null, // Default null
      predictions: [], // Prediction kosong
      createdAt: Firestore.FieldValue.serverTimestamp(),
    };

    // Tambahkan transaksi ke batch
    batch.set(userRefByUsername, userData);

    // Commit batch transaksi
    await batch.commit();

    // Respons sukses
    return res.status(200).json({
      success: true,
      message: "Pendaftaran berhasil, silahkan login.",
    });
  } catch (error) {
    console.error("Error registrasi:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal melakukan pendaftaran.",
      error: error.message || "Internal server error",
    });
  }
};

module.exports = registerHandler;