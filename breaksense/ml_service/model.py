"""
model.py
--------
Trains a K-Nearest Neighbors classifier that maps (mood, stress_level, work_duration)
→ (break_type, recommended_duration).

Run this directly to generate/retrain the model:
    python model.py
"""

import numpy as np
import pandas as pd
import joblib
import os
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

MODEL_PATH    = os.path.join(os.path.dirname(__file__), 'knn_model.joblib')
ENCODER_PATH  = os.path.join(os.path.dirname(__file__), 'label_encoder.joblib')
DURATION_PATH = os.path.join(os.path.dirname(__file__), 'duration_map.joblib')


TRAINING_DATA = [
    (1, 3, 2.0, 'Box Breathing', 5),
    (2, 3, 1.0, '5-4-3-2-1 Grounding', 5),
    (3, 3, 3.0, 'Visualization', 10),
    (2, 2, 2.0, 'Body Scan', 10),
    (4, 2, 4.0, 'Gratitude Journaling', 5),
    (3, 1, 1.5, 'Single-Tasking Focus', 10),

    (5, 1, 2.0, 'Sun Salutation', 10),
    (4, 1, 1.0, '5-Min Walk', 5),
    (5, 2, 0.5, 'Jumping Jacks', 5),
    (3, 2, 4.0, 'Neck & Shoulder Stretch', 5),
    (3, 2, 5.0, 'Standing Desk Stretches', 5),
    (2, 1, 3.0, 'Doorway Chest Stretch', 5),

    (3, 2, 2.0, 'Hydration Reset', 5),
    (4, 1, 3.0, 'Brain Snack', 10),
    (5, 1, 5.0, 'Balanced Meal Prep', 20),
    (4, 2, 1.0, 'Herbal Tea Break', 10),
    (3, 1, 0.5, 'Mindful Chewing', 5),
    (5, 1, 1.5, 'Fruit Infused Water', 5),

    (1, 3, 5.0, 'Power Nap', 20),
    (3, 2, 0.5, 'Eye Rest 20-20-20', 5),
    (2, 2, 1.0, 'Quiet Sitting', 10),
    (1, 2, 4.0, 'Digital Detox', 15),
    (4, 3, 2.0, 'Lo-fi Music Rest', 10),
    (1, 3, 3.0, 'Progressive Relaxation', 15),

    (1, 3, 4.0, 'Power Nap', 20),
    (2, 3, 4.0, 'Progressive Relaxation', 15),
    (5, 1, 1.0, 'Jumping Jacks', 5),
    (5, 1, 4.0, 'Sun Salutation', 10),
    (2, 1, 0.5, 'Eye Rest 20-20-20', 5),
    (1, 2, 2.0, 'Box Breathing', 5),
    (4, 1, 5.0, 'Balanced Meal Prep', 20),
    (3, 3, 0.5, 'Quiet Sitting', 10)
]

def build_dataframe():
    df = pd.DataFrame(TRAINING_DATA, columns=['mood', 'stress', 'work_hours', 'break_type', 'duration'])
    return df

def train():
    df = build_dataframe()

    X = df[['mood', 'stress', 'work_hours']].values
    y = df['break_type'].values

    # Duration map: average recommended duration per break type
    duration_map = df.groupby('break_type')['duration'].mean().to_dict()

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42
    )

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('knn',    KNeighborsClassifier(n_neighbors=3, weights='distance')),
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print("── Classification Report ──")
    # Use zero_division parameter to avoid errors if some classes are missing from a small test split
    print(classification_report(
        y_test, 
        y_pred, 
        labels=np.arange(len(le.classes_)), # Tells it to look for all class indices
        target_names=le.classes_, 
        zero_division=0
    ))

    joblib.dump(pipeline,    MODEL_PATH)
    joblib.dump(le,          ENCODER_PATH)
    joblib.dump(duration_map, DURATION_PATH)
    print(f"✅ Model saved → {MODEL_PATH}")
    return pipeline, le, duration_map

def load():
    """Load a pre-trained model; train if not found."""
    if not os.path.exists(MODEL_PATH):
        print("No saved model found. Training now...")
        return train()
    pipeline     = joblib.load(MODEL_PATH)
    le           = joblib.load(ENCODER_PATH)
    duration_map = joblib.load(DURATION_PATH)
    return pipeline, le, duration_map

def predict(mood: int, stress_level: int, work_duration: float, pipeline=None, le=None, duration_map=None):
    """Return (break_type, recommended_duration_minutes)."""
    if pipeline is None or le is None or duration_map is None:
        pipeline, le, duration_map = load()

    X = np.array([[mood, stress_level, work_duration]])
    y_enc = pipeline.predict(X)[0]
    break_type = le.inverse_transform([y_enc])[0]
    duration   = int(duration_map.get(break_type, 5))

    # Return a dictionary to match app.py expectations
    return {
        "break_type": break_type,
        "duration_minutes": duration,
        "reason": f"Based on your mood ({mood}/5) and stress ({stress_level}/3).",
        "tips": ["Take deep breaths", "Step away from the screen"]
    }

if __name__ == '__main__':
    train()