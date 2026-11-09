"""
FSI and BORI Calculation Module
================================
Implements Food Shortage Index (FSI) and Bear Outbreak Risk Index (BORI)
based on ecological models of masting and lag population dynamics.
"""

import math

def calculate_fsi(beech_pred: float, oak_pred: float) -> float:
    """
    Calculate Food Shortage Index (FSI_t)
    FSI_t = (3 - b_hat) + (3 - o_hat)
    Range: 0.0 (maximum abundance) to 6.0 (complete failure / severe famine)
    """
    b_val = max(0.0, min(3.0, float(beech_pred)))
    o_val = max(0.0, min(3.0, float(oak_pred)))
    return (3.0 - b_val) + (3.0 - o_val)

def calculate_bori(fsi_current: float, fsi_previous: float) -> float:
    """
    Calculate Bear Outbreak Risk Index (BORI_t)
    BORI_t = 10^3 * exp(FSI_t - 2.7890 * FSI_{t-1})
    """
    fsi_cur = float(fsi_current)
    fsi_prev = float(fsi_previous)
    exponent = fsi_cur - 2.7890 * fsi_prev
    return 1000.0 * math.exp(exponent)

def get_risk_level(bori: float) -> dict:
    """
    Return human-readable alert level and description based on BORI score.
    """
    if bori >= 15.0:
        return {
            "level": "特別警戒 (Severe Alert)",
            "code": "CRITICAL",
            "color": "#ef4444",
            "description": "3樹種同調大凶作と前年個体数増が重なり、記録的な大量出没・人里侵入リスクが極めて高い状態です。"
        }
    elif bori >= 7.0:
        return {
            "level": "警戒 (Alert)",
            "code": "HIGH",
            "color": "#f97316",
            "description": "主要堅果類が凶作であり、山間部から集落周辺へのエサ探索行動が活発化するリスクがあります。"
        }
    elif bori >= 2.0:
        return {
            "level": "注意 (Advisory)",
            "code": "MODERATE",
            "color": "#eab308",
            "description": "局所的なエサ不足により、生ごみや果樹などへの誘引出没が発生しやすい状態です。"
        }
    else:
        return {
            "level": "正常・低リスク (Normal / Low)",
            "code": "LOW",
            "color": "#22c55e",
            "description": "山林内の堅果類が維持されており、人里への出没圧力は平年以下にとどまります。"
        }
