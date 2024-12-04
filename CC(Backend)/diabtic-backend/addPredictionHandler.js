const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const jwt = require('jsonwebtoken');

// Inisialisasi Firestore client
const firestore = new Firestore();

const addPredictionHandler = async (req, res) => {
  const authHeader = req.headers.authorization;

  // Validasi header authorization
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
    const { username } = decoded;

    // Validasi input body
    const { age, gender, bmi, smoking, alcoholConsumption, physicalActivity, dietQuality, sleepQuality, familyHistoryDiabetes, gestationalDiabetes, previousPreDiabetes, hypertension, systolicBP, diastolicBP, fastingBloodSugar, hbA1c, cholesterolTotal, antihypertensiveMedications, antidiabeticMedications, frequentUrination, excessiveThirst, unexplainedWeightLoss, fatigueLevels, blurredVision, slowHealingSores, tinglingHandsFeet, qualityOfLifeScore, heavyMetalsExposure, occupationalExposureChemicals, waterQuality, medicalCheckupsFrequency, medicationAdherence, healthLiteracy, } = req.body;
    const requiredFields = [age, gender, bmi, smoking, alcoholConsumption, physicalActivity, dietQuality, sleepQuality, familyHistoryDiabetes, gestationalDiabetes, previousPreDiabetes, hypertension, systolicBP, diastolicBP, fastingBloodSugar, hbA1c, cholesterolTotal, antihypertensiveMedications, antidiabeticMedications, frequentUrination, excessiveThirst, unexplainedWeightLoss, fatigueLevels, blurredVision, slowHealingSores, tinglingHandsFeet, qualityOfLifeScore, heavyMetalsExposure, occupationalExposureChemicals, waterQuality, medicalCheckupsFrequency, medicationAdherence, healthLiteracy];
    
    // Cek apakah semua field telah terisi
    if (requiredFields.some(field => field == null)) {
      return res.status(400).json({
        success: false,
        message: "Lengkapi semua data prediksi.",
      });
    }

    // Panggil API untuk prediksi
    const { data: { prediction } } = await axios.post(
      'https://diabetes-risk-model-893955223741.asia-southeast2.run.app/predict',
      { age, gender, bmi, smoking, alcoholConsumption, physicalActivity, dietQuality, sleepQuality, familyHistoryDiabetes, gestationalDiabetes, previousPreDiabetes, hypertension, systolicBP, diastolicBP, fastingBloodSugar, hbA1c, cholesterolTotal, antihypertensiveMedications, antidiabeticMedications, frequentUrination, excessiveThirst, unexplainedWeightLoss, fatigueLevels, blurredVision, slowHealingSores, tinglingHandsFeet, qualityOfLifeScore, heavyMetalsExposure, occupationalExposureChemicals, waterQuality, medicalCheckupsFrequency, medicationAdherence, healthLiteracy }
    );

    // Ambil referensi pengguna dari Firestore
    const userRef = firestore.collection("users").doc(username);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    // Ambil data pengguna dan prediksi yang sudah ada
    const { predictions = [] } = userDoc.data();

    // Buat prediksi baru
    const newPrediction = {
      id: `prediction-${Date.now()}`, // ID unik prediksi
      predictionResult: prediction,
      predictionDetails: { age, gender, bmi, smoking, alcoholConsumption, physicalActivity, dietQuality, sleepQuality, familyHistoryDiabetes, gestationalDiabetes, previousPreDiabetes, hypertension, systolicBP, diastolicBP, fastingBloodSugar, hbA1c, cholesterolTotal, antihypertensiveMedications, antidiabeticMedications, frequentUrination, excessiveThirst, unexplainedWeightLoss, fatigueLevels, blurredVision, slowHealingSores, tinglingHandsFeet, qualityOfLifeScore, heavyMetalsExposure, occupationalExposureChemicals, waterQuality, medicalCheckupsFrequency, medicationAdherence, healthLiteracy },
      predictionSuggestion: prediction === 'Yes' ? 'Risky' : 'Not risky',
      createdAt: new Date().toISOString(),
    };

    // Update prediksi
    const updatedPredictions = [...predictions, newPrediction];

    // Perbarui Firestore dengan prediksi baru
    await userRef.update({
      predictions: updatedPredictions,
    });

    // Respons sukses
    return res.status(200).json({
      success: true,
      message: "Prediksi berhasil disimpan.",
      data: { username, prediction: newPrediction },
    });
  } catch (error) {
    console.error("Error menambahkan prediksi: ", error);

    // Tangani error spesifik terkait JWT
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau telah kedaluwarsa.",
      });
    }

    // Tangani kesalahan lainnya
    return res.status(500).json({
      success: false,
      message: "Kesalahan saat menyimpan prediksi.",
    });
  }
};

module.exports = addPredictionHandler;
