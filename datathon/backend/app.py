from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})


# Cargar modelos
model_monto = joblib.load('rf_model_monto.joblib')
model_dias = joblib.load('rf_model_fecha.joblib')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json  # Debe ser una lista de listas: [[...]]
        print("Petición recibida con datos:", data)

        df = pd.DataFrame(data, columns=[
            "dias_desde_ultima", 
            "monto", 
            "media_monto_hist", 
            "std_monto_hist", 
            "num_tx_cliente_comercio"
        ])

        monto_pred = model_monto.predict(df)[0]
        dias_pred = model_dias.predict(df)[0]

        return jsonify({
            "monto_estimado": round(float(monto_pred), 2),
            "dias_estimados": int(dias_pred)
        })
    except Exception as e:
        print("Error en predicción:", str(e))
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1')
