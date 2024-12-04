const { Firestore } = require("@google-cloud/firestore");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const firestore = new Firestore();

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (error) {
    throw new Error("Token tidak valid atau telah kedaluwarsa.");
  }
};

// Membuat token JWT baru
const generateToken = (username) => {
  return jwt.sign({ username }, process.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
  });
};

const editAccountHandler = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Token tidak ditemukan.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verifikasi token
    const decoded = verifyToken(token);
    const { username } = decoded;

    const { field, value } = req.body;

    if (!field || !value) {
      return res.status(400).json({
        success: false,
        message: "Field dan value harus disertakan.",
      });
    }

    // Referensi pengguna di Firestore
    const userRef = firestore.collection("users").doc(username);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    // Cek keberadaan data yang sama di database
    if (["username", "email", "phone"].includes(field)) {
      const usersSnapshot = await firestore
        .collection("users")
        .where(field, "==", value)
        .get();

      if (!usersSnapshot.empty) {
        return res.status(409).json({
          success: false,
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} sudah digunakan.`,
        });
      }
    }

    // Update data di Firestore
    if (field === "username") {
      const newUsernameRef = firestore.collection("users").doc(value);

      // Cek username baru
      const newUsernameDoc = await newUsernameRef.get();
      if (newUsernameDoc.exists) {
        return res.status(409).json({
          success: false,
          message: "Username baru sudah digunakan.",
        });
      }

      // Copy data ke doc baru dengan username baru
      await newUsernameRef.set({ ...userDoc.data(), username: value });

      // Hapus dokumen lama
      await userRef.delete();

      // Buat token baru
      const newToken = generateToken(value);

      return res.status(200).json({
        success: true,
        message: "Username berhasil diubah.",
        data: { token: newToken },
      });
    } else if (field === "password") {
      // Hash password baru menggunakan bcryptjs
      const hashedPassword = bcrypt.hashSync(value, 10);

      await userRef.update({
        password: hashedPassword,
      });

      return res.status(200).json({
        success: true,
        message: "Password berhasil diubah.",
      });
    } else {
      // Untuk field lain
      await userRef.update({
        [field]: value,
      });

      return res.status(200).json({
        success: true,
        message: `${field} berhasil diubah.`,
      });
    }
  } catch (error) {
    console.error("Error edit akun: ", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal mengedit akun.",
    });
  }
};

module.exports = editAccountHandler;
