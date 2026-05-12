from flask import Flask, request, jsonify
import model  # Imports the logic from your model.py file
import os

app = Flask(__name__)

# Load the KNN model and metadata once when the server starts
try:
    pipeline, le, duration_map = model.load()
    print("✅ KNN Model and Encoders loaded successfully.")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    # If loading fails, we attempt to train it to generate the files
    pipeline, le, duration_map = model.train()

@app.route('/predict', methods=['POST'])
def predict_break():
    """
    Endpoint for the Node.js backend to request a recommendation.
    Expects JSON: { "mood": 1-5, "stress": 1-3, "work_duration": float }
    """
    try:
        data = request.get_json()
        
        # Extract features from request
        mood = data.get('mood')
        stress = data.get('stress')
        work_duration = data.get('work_duration')

        # Validate inputs
        if None in [mood, stress, work_duration]:
            return jsonify({"error": "Missing input features"}), 400

        # Use the logic from model.py to get the prediction
        result = model.predict(mood, stress, work_duration, pipeline, le, duration_map)
        
        # Return the recommendation in the format expected by the frontend
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
    # Use environment port for deployment (e.g., Render, Heroku)
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port)