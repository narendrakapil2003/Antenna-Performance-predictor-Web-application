import pandas as pd
import joblib
import json
import sys
import os

# Load the model and feature columns
model_path = os.path.join(os.path.dirname(__file__), "antenna_predictor.pkl")
model_bundle = joblib.load(model_path)
model = model_bundle["model"]
expected_columns = model_bundle["feature_columns"]

# Read JSON input from stdin
input_data = json.load(sys.stdin)

# Convert input to DataFrame
df = pd.DataFrame([input_data])

# One-hot encode Antenna_Type
df = pd.get_dummies(df, columns=["Antenna_Type"], prefix="Antenna_Type")

# Add missing columns with zero (if any)
for col in expected_columns:
    if col not in df.columns:
        df[col] = 0

# Reorder columns to match training order
df = df[expected_columns]

# Make prediction
preds = model.predict(df)[0]

# Output prediction
output = {
    "Gain": round(preds[0], 2),
    "Efficiency_Percentage": round(preds[1], 2),
    "Cost": round(preds[2], 2)
}
print(json.dumps(output))
