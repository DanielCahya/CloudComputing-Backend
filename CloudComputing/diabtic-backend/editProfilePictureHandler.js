const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');
const jwt = require('jsonwebtoken');

// Inisialisasi Cloud Storage dan Firestore
const storage = new Storage();
const firestore = new Firestore();

// Nama bucket Google Cloud Storage untuk foto profil
const bucketName = process.env.GCS_BUCKET_NAME;

// Fungsi untuk verifikasi token JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (error) {
    throw new Error('Token tidak valid atau telah kedaluwarsa.');
  }
};

const editProfilePictureHandler = async (req, res) => {
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
    const decoded = verifyToken(token);
    const { username } = decoded;

    // Ambil file gambar dari request
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada file yang di-upload.",
      });
    }

    // Ambil data pengguna dari Firestore
    const userRef = firestore.collection("users").doc(username);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    const { profilePicture: oldProfilePicture } = userDoc.data();

    // Hapus gambar profil lama dari Google Cloud Storage (jika ada)
    if (oldProfilePicture) {
      const oldFileName = oldProfilePicture.split("/").pop();
      const oldFile = storage.bucket(bucketName).file(`${username}/profile-pictures/${oldFileName}`);
      try {
        await oldFile.delete();
      } catch (err) {
        console.warn('Gagal menghapus gambar lama dari Storage:', err.message);
      }
    }

    // Nama file untuk disimpan di Google Cloud Storage
    const fileName = `${username}/profile-pictures/${Date.now()}-${file.originalname}`;

    // Upload file ke Cloud Storage
    const fileUploadPromise = new Promise((resolve, reject) => {
      const bucket = storage.bucket(bucketName);
      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
      });

      blobStream.on('finish', () => {
        const profilePictureUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        resolve(profilePictureUrl);
      });

      blobStream.on('error', (err) => reject(err));

      blobStream.end(file.buffer);
    });

    // Tunggu sampai upload selesai dan update Firestore
    const profilePictureUrl = await fileUploadPromise;

    // Update Firestore dengan URL foto profil baru
    await userRef.update({
      profilePicture: profilePictureUrl,
    });

    // Respons sukses
    return res.status(200).json({
      success: true,
      message: "Foto profil berhasil diubah.",
      data: { profilePictureUrl },
    });
  } catch (error) {
    console.error("Error edit gambar profil: ", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal mengedit foto profil.",
    });
  }
};

module.exports = editProfilePictureHandler;