import os
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from google.cloud import storage

# Load model from Google Cloud Storage
def load_model_from_gcs():
    bucket_name = "diabtic-capstone-project.appspot.com"
    model_path = "diabetes_prediction_model.h5"
    local_model_path = "/tmp/diabetes_model.h5"

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(model_path)
    blob.download_to_filename(local_model_path)

    model = tf.keras.models.load_model(local_model_path)
    return model

# Define the Flask app
app = Flask(__name__)
model = load_model_from_gcs()

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        # Prepare features based on the input data
        features = np.array([[
            data["age"],
            data["gender"],
            data["bmi"],
            data["smoking"],
            data["alcoholConsumption"],
            data["physicalActivity"],
            data["dietQuality"],
            data["sleepQuality"],
            data["familyHistoryDiabetes"],
            data["gestationalDiabetes"],
            # data["pcos"],
            data["previousPreDiabetes"],
            data["hypertension"],
            data["systolicBP"],
            data["diastolicBP"],
            data["fastingBloodSugar"],
            data["hbA1c"],
            data["cholesterolTotal"],
            data["antihypertensiveMedications"],
            # data["statins"],
            data["antidiabeticMedications"],
            data["frequentUrination"],
            data["excessiveThirst"],
            data["unexplainedWeightLoss"],
            data["fatigueLevels"],
            data["blurredVision"],
            data["slowHealingSores"],
            data["tinglingHandsFeet"],
            data["qualityOfLifeScore"],
            data["heavyMetalsExposure"],
            data["occupationalExposureChemicals"],
            data["waterQuality"],
            data["medicalCheckupsFrequency"],
            data["medicationAdherence"],
            data["healthLiteracy"]
            # data["diagnosis"]
        ]])

        # Make prediction
        prediction_prob = model.predict(features)
        result = "Yes" if prediction_prob[0][0] >= 0.5 else "No"

        return jsonify({
            "success": True,
            "prediction": result
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
