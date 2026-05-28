from flask import Flask, request, jsonify
import model
import os

app = Flask(__name__)

try:
    pipeline, le, duration_map = model.load()
    print("✅ KNN Model and Encoders loaded successfully.")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    pipeline, le, duration_map = model.train()

@app.route('/predict', methods=['POST'])
def predict_break():
    """
    Endpoint for the Node.js backend to request a recommendation.
    Expects JSON: { "mood": 1-5, "stress": 1-3, "work_duration": float }
    """
    try:
        data = request.get_json()

        mood = data.get('mood')
        stress = data.get('stress')
        work_duration = data.get('work_duration')

        if None in [mood, stress, work_duration]:
            return jsonify({"error": "Missing input features"}), 400

        result = model.predict(mood, stress, work_duration, pipeline, le, duration_map)

        return jsonify({
            "break_type": result['break_type'],
            "duration_minutes": int(result['duration_minutes']),
            "reason": result['reason'],
            "tips": result.get('tips', [])
        })

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({"error": "Internal Server Error"}), 500

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "ML Service is running"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port)