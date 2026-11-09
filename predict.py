"""
Beech and Oak Masting & BORI CLI Predictor
===========================================
CLI tool to predict beech and oak masting index, FSI, and BORI risk score
using the trained Random Forest models.
"""

import os
import argparse
import joblib
import pandas as pd
import numpy as np
from fsi_bori import calculate_fsi, calculate_bori, get_risk_level

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(SCRIPT_DIR, "models")

BEECH_MODEL_PATH = os.path.join(MODELS_DIR, "rf_beech.pkl")
OAK_MODEL_PATH = os.path.join(MODELS_DIR, "rf_oak.pkl")

BEECH_FEATURES = ['prev_temp_m7', 'prev_sun_m7', 'temp_m7', 'sun_m7', 'NDVI_anom_m8', 'prev_masting']
OAK_FEATURES = ['temp_m5', 'precip_m5', 'sun_m5', 'temp_m8', 'precip_m8', 'NDRE_anom_m8', 'prev_masting']

def load_models():
    if not os.path.exists(BEECH_MODEL_PATH) or not os.path.exists(OAK_MODEL_PATH):
        raise FileNotFoundError(
            f"Model files not found in {MODELS_DIR}. Run train_export.py first."
        )
    rf_beech = joblib.load(BEECH_MODEL_PATH)
    rf_oak = joblib.load(OAK_MODEL_PATH)
    return rf_beech, rf_oak

def predict_single(args):
    rf_beech, rf_oak = load_models()

    # Beech input
    df_beech = pd.DataFrame([{
        'prev_temp_m7': args.prev_temp_m7,
        'prev_sun_m7': args.prev_sun_m7,
        'temp_m7': args.temp_m7,
        'sun_m7': args.sun_m7,
        'NDVI_anom_m8': args.ndvi_anom_m8,
        'prev_masting': args.prev_masting_beech
    }])[BEECH_FEATURES]

    # Oak input
    df_oak = pd.DataFrame([{
        'temp_m5': args.temp_m5,
        'precip_m5': args.precip_m5,
        'sun_m5': args.sun_m5,
        'temp_m8': args.temp_m8,
        'precip_m8': args.precip_m8,
        'NDRE_anom_m8': args.ndre_anom_m8,
        'prev_masting': args.prev_masting_oak
    }])[OAK_FEATURES]

    beech_pred = float(rf_beech.predict(df_beech)[0])
    oak_pred = float(rf_oak.predict(df_oak)[0])

    fsi_curr = calculate_fsi(beech_pred, oak_pred)
    bori = calculate_bori(fsi_curr, args.prev_fsi)
    risk = get_risk_level(bori)

    print("=" * 60)
    print(" 堅果類豊凶予測 ＆ クマ出没リスク（BORI）算出結果")
    print("=" * 60)
    print(f"■ ブナ結実予測値 (b̂_t) : {beech_pred:.3f} / 3.000")
    print(f"■ ナラ結実予測値 (ô_t) : {oak_pred:.3f} / 3.000")
    print("-" * 60)
    print(f"■ エサ不足指標 (FSI_t) : {fsi_curr:.3f} / 6.000  (前年 FSI: {args.prev_fsi:.3f})")
    print(f"■ 出没リスク指標 (BORI) : {bori:.3f}")
    print(f"■ 警戒レベル判定       : {risk['level']}")
    print(f"■ 状況説明             : {risk['description']}")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="Predict Beech/Oak masting index, FSI, and BORI.")
    
    # Beech args
    parser.add_argument("--prev_temp_m7", type=float, default=25.0, help="前年7月平均気温 (°C)")
    parser.add_argument("--prev_sun_m7", type=float, default=75.0, help="前年7月日照時間比率 (%%)")
    parser.add_argument("--temp_m7", type=float, default=26.0, help="当年7月平均気温 (°C)")
    parser.add_argument("--sun_m7", type=float, default=75.0, help="当年7月日照時間比率 (%%)")
    parser.add_argument("--ndvi_anom_m8", type=float, default=0.0, help="当年8月NDVIアノマリー")
    parser.add_argument("--prev_masting_beech", type=float, default=2.0, help="前年ブナ結実実績 (0:大凶作〜3:豊作)")

    # Oak args
    parser.add_argument("--temp_m5", type=float, default=17.0, help="当年5月平均気温 (°C)")
    parser.add_argument("--precip_m5", type=float, default=1000.0, help="当年5月気圧・降水要因 (hPa/mm)")
    parser.add_argument("--sun_m5", type=float, default=65.0, help="当年5月日照時間比率 (%%)")
    parser.add_argument("--temp_m8", type=float, default=26.5, help="当年8月平均気温 (°C)")
    parser.add_argument("--precip_m8", type=float, default=1000.0, help="当年8月気圧・降水要因 (hPa/mm)")
    parser.add_argument("--ndre_anom_m8", type=float, default=0.0, help="当年8月NDREアノマリー")
    parser.add_argument("--prev_masting_oak", type=float, default=2.0, help="前年ナラ結実実績 (0:大凶作〜3:豊作)")

    # Lag FSI
    parser.add_argument("--prev_fsi", type=float, default=2.0, help="前年エサ不足指標 (FSI_{t-1}, 0〜6)")

    args = parser.parse_args()
    predict_single(args)

if __name__ == "__main__":
    main()
