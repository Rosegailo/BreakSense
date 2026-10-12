"""
model.py
--------
Trains a K-Nearest Neighbors classifier that maps (mood, stress_level, work_duration)
→ (break_type, recommended_duration).
"""

import numpy as np
import pandas as pd
import joblib
import os
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

MODEL_PATH    = os.path.join(os.path.dirname(__file__), 'knn_model.joblib')
ENCODER_PATH  = os.path.join(os.path.dirname(__file__), 'label_encoder.joblib')
DURATION_PATH = os.path.join(os.path.dirname(__file__), 'duration_map.joblib')

# Balanced training dataset with multiple samples per break type across (mood 1-5, stress 1-3, work_hours 0.25-5.0)
TRAINING_DATA = [
    # Box Breathing (Low mood, High stress)
    (1, 3, 2.0, 'Box Breathing', 5),
    (1, 3, 1.0, 'Box Breathing', 5),
    (2, 3, 1.5, 'Box Breathing', 5),
    (2, 3, 3.0, 'Box Breathing', 5),

    # 5-4-3-2-1 Grounding (Very low mood, High stress)
    (1, 3, 0.5, '5-4-3-2-1 Grounding', 5),
    (2, 3, 1.0, '5-4-3-2-1 Grounding', 5),
    (1, 2, 1.0, '5-4-3-2-1 Grounding', 5),

    # Visualization (Moderate mood, High stress)
    (3, 3, 3.0, 'Visualization', 10),
    (2, 3, 2.5, 'Visualization', 10),
    (3, 3, 2.0, 'Visualization', 10),

    # Body Scan (Low/Moderate mood, Moderate/High stress)
    (2, 2, 2.0, 'Body Scan', 10),
    (3, 2, 3.0, 'Body Scan', 10),
    (2, 3, 3.5, 'Body Scan', 10),

    # Gratitude Journaling (Moderate mood, Moderate stress)
    (4, 2, 4.0, 'Gratitude Journaling', 5),
    (3, 2, 1.5, 'Gratitude Journaling', 5),
    (3, 2, 2.5, 'Gratitude Journaling', 5),

    # Single-Tasking Focus (Moderate mood, Low stress)
    (3, 1, 1.5, 'Single-Tasking Focus', 10),
    (3, 1, 2.5, 'Single-Tasking Focus', 10),
    (4, 1, 2.0, 'Single-Tasking Focus', 10),

    # Sun Salutation (High mood, Low stress)
    (5, 1, 2.0, 'Sun Salutation', 10),
    (4, 1, 2.5, 'Sun Salutation', 10),
    (5, 1, 3.5, 'Sun Salutation', 10),

    # 5-Min Walk (Energetic/Good mood, Low/Moderate stress)
    (4, 1, 1.0, '5-Min Walk', 5),
    (5, 1, 1.5, '5-Min Walk', 5),
    (4, 2, 2.0, '5-Min Walk', 5),
    (3, 1, 1.0, '5-Min Walk', 5),

    # Jumping Jacks (High mood, Low stress, Short work)
    (5, 1, 0.5, 'Jumping Jacks', 5),
    (4, 1, 0.75, 'Jumping Jacks', 5),
    (5, 2, 0.5, 'Jumping Jacks', 5),

    # Neck & Shoulder Stretch (Moderate mood, Sitting strain)
    (3, 2, 4.0, 'Neck & Shoulder Stretch', 5),
    (2, 2, 3.5, 'Neck & Shoulder Stretch', 5),
    (3, 2, 3.0, 'Neck & Shoulder Stretch', 5),

    # Standing Desk Stretches (Long work hours)
    (3, 2, 5.0, 'Standing Desk Stretches', 5),
    (4, 2, 4.5, 'Standing Desk Stretches', 5),
    (3, 1, 4.0, 'Standing Desk Stretches', 5),

    # Doorway Chest Stretch (Sitting posture strain)
    (2, 1, 3.0, 'Doorway Chest Stretch', 5),
    (3, 2, 3.5, 'Doorway Chest Stretch', 5),
    (2, 2, 4.0, 'Doorway Chest Stretch', 5),

    # Hydration Reset (Moderate mood, Short/Medium work)
    (3, 2, 2.0, 'Hydration Reset', 5),
    (4, 1, 1.5, 'Hydration Reset', 5),
    (3, 1, 1.0, 'Hydration Reset', 5),

    # Brain Snack (Good mood, Medium work)
    (4, 1, 3.0, 'Brain Snack', 10),
    (3, 2, 3.5, 'Brain Snack', 10),
    (4, 2, 2.5, 'Brain Snack', 10),

    # Balanced Meal Prep (High mood, Long work)
    (5, 1, 5.0, 'Balanced Meal Prep', 20),
    (4, 1, 4.5, 'Balanced Meal Prep', 20),
    (4, 2, 4.0, 'Balanced Meal Prep', 20),

    # Herbal Tea Break (Moderate mood & stress)
    (4, 2, 1.0, 'Herbal Tea Break', 10),
    (3, 2, 1.5, 'Herbal Tea Break', 10),
    (3, 2, 2.0, 'Herbal Tea Break', 10),

    # Mindful Chewing (Short work, Low stress)
    (3, 1, 0.5, 'Mindful Chewing', 5),
    (4, 1, 0.75, 'Mindful Chewing', 5),

    # Fruit Infused Water (High mood, Low stress)
    (5, 1, 1.5, 'Fruit Infused Water', 5),
    (4, 1, 2.0, 'Fruit Infused Water', 5),

    # Power Nap (Very low mood/extreme fatigue, High work)
    (1, 3, 5.0, 'Power Nap', 20),
    (1, 3, 4.0, 'Power Nap', 20),
    (1, 2, 4.5, 'Power Nap', 20),
    (2, 3, 5.0, 'Power Nap', 20),

    # Eye Rest 20-20-20 (Short work sessions)
    (3, 2, 0.25, 'Eye Rest 20-20-20', 5),
    (4, 1, 0.5, 'Eye Rest 20-20-20', 5),
    (3, 1, 0.3, 'Eye Rest 20-20-20', 5),
    (2, 1, 0.5, 'Eye Rest 20-20-20', 5),

    # Quiet Sitting (Moderate mood, Low/Moderate stress)
    (2, 2, 1.0, 'Quiet Sitting', 10),
    (3, 2, 1.5, 'Quiet Sitting', 10),
    (3, 3, 0.5, 'Quiet Sitting', 10),

    # Digital Detox (Low mood, Long screen work)
    (1, 2, 4.0, 'Digital Detox', 15),
    (2, 2, 4.5, 'Digital Detox', 15),
    (1, 3, 3.5, 'Digital Detox', 15),

    # Lo-fi Music Rest (High stress, Auditory relaxation)
    (4, 3, 2.0, 'Lo-fi Music Rest', 10),
    (3, 3, 2.5, 'Lo-fi Music Rest', 10),
    (4, 3, 1.5, 'Lo-fi Music Rest', 10),

    # Progressive Relaxation (Very low mood, High stress)
    (1, 3, 3.0, 'Progressive Relaxation', 15),
    (2, 3, 4.0, 'Progressive Relaxation', 15),
    (1, 3, 3.5, 'Progressive Relaxation', 15),
]

def build_dataframe():
    return pd.DataFrame(TRAINING_DATA, columns=['mood', 'stress', 'work_hours', 'break_type', 'duration'])

def train():
    df = build_dataframe()

    X = df[['mood', 'stress', 'work_hours']].values
    y = df['break_type'].values

    duration_map = df.groupby('break_type')['duration'].mean().to_dict()

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('knn',    KNeighborsClassifier(n_neighbors=3, weights='distance')),
    ])
    pipeline.fit(X, y_enc)

    joblib.dump(pipeline,    MODEL_PATH)
    joblib.dump(le,          ENCODER_PATH)
    joblib.dump(duration_map, DURATION_PATH)
    print(f"✅ Trained KNN Model on {len(df)} samples across {len(le.classes_)} classes.")
    return pipeline, le, duration_map

def load():
    if not os.path.exists(MODEL_PATH):
        return train()
    pipeline     = joblib.load(MODEL_PATH)
    le           = joblib.load(ENCODER_PATH)
    duration_map = joblib.load(DURATION_PATH)
    return pipeline, le, duration_map

def predict(mood: int, stress_level: int, work_duration: float, pipeline=None, le=None, duration_map=None):
    if pipeline is None or le is None or duration_map is None:
        pipeline, le, duration_map = load()

    X = np.array([[mood, stress_level, work_duration]])
    y_enc = pipeline.predict(X)[0]
    break_type = le.inverse_transform([y_enc])[0]
    duration   = int(duration_map.get(break_type, 5))

    return {
        "break_type": break_type,
        "duration_minutes": duration,
        "reason": f"KNN Prediction based on mood ({mood}/5), stress ({stress_level}/3), and study time ({work_duration:.1f}h).",
        "tips": ["Take deep breaths", "Step away from screens"]
    }

if __name__ == '__main__':
    train()
