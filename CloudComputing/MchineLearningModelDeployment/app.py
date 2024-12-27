from flask import Flask, request, jsonify
import numpy as np
import joblib
import tensorflow as tf
from google.cloud import storage
from ensemble_layer import EnsembleLayer
import os

app = Flask(__name__)

# Cloud Storage configuration
BUCKET_NAME = "diabtic-capstone-project.appspot.com"
MODEL_PATH = "model"
LOCAL_MODEL_DIR = "./models"

# List of model files
FILES = {
    "scaler": "scaler.pkl",
    "rf_model": "rf_model.pkl",
    "xgb_model": "xgb_model.pkl",
    "svm_model": "svm_model.pkl",
    "dnn_model": "dnn_model.h5",
    "ensemble_model": "ensemble_model.h5"
}

# Download files from Google Cloud Storage
def download_files():
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)

    if not os.path.exists(LOCAL_MODEL_DIR):
        os.makedirs(LOCAL_MODEL_DIR)

    for key, file_name in FILES.items():
        blob = bucket.blob(f"{MODEL_PATH}/{file_name}")
        local_path = os.path.join(LOCAL_MODEL_DIR, file_name)
        blob.download_to_filename(local_path)
        print(f"Downloaded {file_name} to {local_path}")

# Call download function at app startup
download_files()

# Load models and scaler
scaler = joblib.load(os.path.join(LOCAL_MODEL_DIR, FILES["scaler"]))
rf_model = joblib.load(os.path.join(LOCAL_MODEL_DIR, FILES["rf_model"]))
xgb_model = joblib.load(os.path.join(LOCAL_MODEL_DIR, FILES["xgb_model"]))
svm_model = joblib.load(os.path.join(LOCAL_MODEL_DIR, FILES["svm_model"]))
dnn_model = tf.keras.models.load_model(os.path.join(LOCAL_MODEL_DIR, FILES["dnn_model"]))
ensemble_model = tf.keras.models.load_model(
    os.path.join(LOCAL_MODEL_DIR, FILES["ensemble_model"]),
    custom_objects={'EnsembleLayer': EnsembleLayer}
)

# Feature names for validation
FEATURES = [
    "age", "gender", "bmi", "smoking", "alcoholConsumption", "physicalActivity",
    "dietQuality", "sleepQuality", "familyHistoryDiabetes", "gestationalDiabetes",
    "previousPreDiabetes", "hypertension", "systolicBP", "diastolicBP",
    "fastingBloodSugar", "hbA1c", "cholesterolTotal", "antihypertensiveMedications",
    "antidiabeticMedications", "frequentUrination", "excessiveThirst",
    "unexplainedWeightLoss", "fatigueLevels", "blurredVision", "slowHealingSores",
    "tinglingHandsFeet", "qualityOfLifeScore", "heavyMetalsExposure",
    "occupationalExposureChemicals", "waterQuality", "medicalCheckupsFrequency",
    "medicationAdherence", "healthLiteracy"
]

@app.route('/predict', methods=['POST'])
def predict():
    # Check if the input contains the correct features
    input_data = request.json
    if not input_data:
        return jsonify({"error": "Invalid input: No JSON payload received"}), 400

    # Ensure all required features are present
    missing_features = [feature for feature in FEATURES if feature not in input_data]
    if missing_features:
        return jsonify({
            "error": "Missing required features",
            "missing_features": missing_features
        }), 400

    try:
        # Extract features in the correct order
        features = [input_data[feature] for feature in FEATURES]

        # Convert input to numpy array
        features_array = np.array(features).reshape(1, -1)
        
        # Preprocess input with the scaler
        scaled_features = scaler.transform(features_array)

        # Predict using the ensemble model
        prediction = ensemble_model.predict(scaled_features)
        risk_score = float(prediction[0][0])
        classification = 'Risky' if risk_score > 0.5 else 'Not Risky'

        return jsonify({
            "risk_score": f"{risk_score:.2f}",
            "classification": classification
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
