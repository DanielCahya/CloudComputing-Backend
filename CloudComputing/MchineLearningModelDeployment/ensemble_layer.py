import tensorflow as tf
import numpy as np
import joblib
import os
from google.cloud import storage

# Konstanta untuk bucket dan file model
BUCKET_NAME = "diabtic-capstone-project.appspot.com"
LOCAL_MODEL_DIR = "./models"
FILES = {
    "rf_model": "rf_model.pkl",
    "xgb_model": "xgb_model.pkl",
    "svm_model": "svm_model.pkl"
}

# Fungsi untuk mengunduh file dari bucket GCS
def download_from_bucket(bucket_name, source_blob_name, destination_file_name):
    """
    Mengunduh file dari bucket Google Cloud Storage ke lokasi lokal.
    """
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    
    # Buat direktori tujuan jika belum ada
    os.makedirs(os.path.dirname(destination_file_name), exist_ok=True)
    blob.download_to_filename(destination_file_name)
    print(f"File {source_blob_name} diunduh ke {destination_file_name}.")

# Unduh model dari bucket GCS
download_from_bucket(BUCKET_NAME, f"model/{FILES['rf_model']}", os.path.join(LOCAL_MODEL_DIR, FILES["rf_model"]))
download_from_bucket(BUCKET_NAME, f"model/{FILES['xgb_model']}", os.path.join(LOCAL_MODEL_DIR, FILES["xgb_model"]))
download_from_bucket(BUCKET_NAME, f"model/{FILES['svm_model']}", os.path.join(LOCAL_MODEL_DIR, FILES["svm_model"]))

# Muat model setelah diunduh
rf_model = joblib.load(os.path.join(LOCAL_MODEL_DIR, FILES["rf_model"]))
xgb_model = joblib.load(os.path.join(LOCAL_MODEL_DIR, FILES["xgb_model"]))
svm_model = joblib.load(os.path.join(LOCAL_MODEL_DIR, FILES["svm_model"]))

# Fungsi untuk membuat prediksi menggunakan model eksternal
def external_models_prediction(inputs):
    rf_probs = rf_model.predict_proba(inputs)[:, 1]
    xgb_probs = xgb_model.predict_proba(inputs)[:, 1]
    svm_probs = svm_model.predict_proba(inputs)[:, 1]
    return np.column_stack((rf_probs, xgb_probs, svm_probs)).astype(np.float32)

# Layer Ensemble
class EnsembleLayer(tf.keras.layers.Layer):
    def __init__(self, dnn_model, **kwargs):
        super(EnsembleLayer, self).__init__(**kwargs)
        self.dnn_model = dnn_model

    def call(self, inputs):
        # Prediksi dari model eksternal
        non_dnn_probs = tf.numpy_function(external_models_prediction, [inputs], tf.float32)
        # Prediksi dari model DNN
        dnn_probs = tf.squeeze(self.dnn_model(inputs))
        # Kombinasi probabilitas
        combined_probs = (non_dnn_probs[:, 0] + non_dnn_probs[:, 1] + non_dnn_probs[:, 2] + dnn_probs) / 4
        return tf.expand_dims(tf.cast(combined_probs > 0.5, tf.int32), axis=-1)

    def compute_output_shape(self, input_shape):
        return (input_shape[0], 1)

    def get_config(self):
        config = super().get_config()
        config.update({"dnn_model": self.dnn_model})
        return config
