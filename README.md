# JSEC 2026: 堅果類の同調凶作とツキノワグマ出没リスク広域予測モデル (BORI)

[![GitHub Pages](https://img.shields.io/badge/Web%20Simulator-Live%20Demo-brightgreen)](https://ssssrabbit.github.io/JSEC2026/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)

本リポジトリは、**JSEC 2026（第24回 高校生・高専生科学技術チャレンジ）** 応募研究：
> **『高分解能衛星画像と気象データの統合による堅果類の同調凶作と野生動物出没リスクの広域予測』**  
> （文教大学付属高等学校 1年 遠藤 最）

における**堅果類結実予測モデルおよび出没リスク指標（BORI）の再現性を担保するためのオープンソースコードおよび対話型Webシミュレーター**です。

---

## 🌐 インタラクティブ Web シミュレーター (GitHub Pages)

ブラウザ上で気象条件や衛星アノマリーのスライダーを動かし、リアルタイムに結実度および出没リスク（BORI）を算出・検証できます（外部通信なし・純粋クライアントサイド動作）。

👉 **[Webシミュレーターを開く (Live Demo)](https://ssssrabbit.github.io/JSEC2026/)**

* 2025年（3樹種同調大凶作・過去最多出没）、2024年（豊作年）、2023年などの実測シナリオをワンクリックで再現可能です。

---

## 📐 数理モデルと計算アルゴリズム

本研究の予測パイプラインは、以下の2段階で構成されています。

```text
[入力: 地上気象データ + Sentinel-2 衛星反射シグナル]
                     │
                     ▼
[第1段階: 機械学習 (Random Forest Regressor)]
  ・ブナ結実予測値   b̂_t = f_RF_Beech( 8月NDVI, 前年夏気候, ... )   [0〜3]
  ・ナラ類結実予測値 ô_t = f_RF_Oak( 8月NDRE, 当年5月気候, ... )    [0〜3]
                     │
                     ▼
[第2段階: 生態学的数理モデル]
  ・エサ不足指標:   FSI_t = (3 - b̂_t) + (3 - ô_t)
  ・出没リスク指標: BORI_t = 10³ × exp( FSI_t - 2.7890 × FSI_{t-1} )
```

### 1. エサ不足指標: $FSI_t$ (Food Shortage Index)
$$FSI_t = (3 - \hat{b}_t) + (3 - \hat{o}_t)$$
* **意味**: 結実度予測値（0: 大凶作 ～ 3: 豊作）を反転させて「エサ欠乏度」に変換し、代替エサ関係にあるブナとナラ類を合算（0.0: 満腹 ～ 6.0: 完全枯渇）。

### 2. 出没リスク指標: $BORI_t$ (Bear Outbreak Risk Index)
$$BORI_t = 10^3 \times \exp(FSI_t - 2.7890 \times FSI_{t-1})$$
* **生態学的背景**: クマの頭数は直接観測できないため、前年のエサ豊凶（$FSI_{t-1}$）を個体数密度の代理変数として組み込んだタイムラグ非線形モデル。
* **メカニズム**: 「前年豊作（$FSI_{t-1}$ が低く出産・生存率増） ➡️ 当年大凶作（$FSI_t$ が高くエサ枯渇）」が連続した際に、指数関数部分が跳ね上がり、人里への侵入圧力が急増する現象を数理モデル化。

---

## ⚙️ 機械学習モデルのパラメータ設計（過学習防止）

| モデル | 対象樹種 | データ規模 | アルゴリズム | 木の数 (`n_estimators`) | 最大深さ (`max_depth`) | 検証手法 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Beech Model** | ブナ | 全国 $N = 13,838$ | Random Forest | 100 | 5 | 5-Fold CV |
| **Oak Model** | ミズナラ・コナラ | 福島県 $N = 16$ | Random Forest | 50 | 3 (過学習防止) | LOOCV (1個抜き交差検証) |

---

## 💻 Python による再現手順

### 1. 環境構築
```bash
git clone https://github.com/ssssrabbit/JSEC2026.git
cd JSEC2026
pip install -r requirements.txt
```

### 2. コマンドラインでの推論実行
```bash
# 2025年 同調大凶作シナリオの推論例
python predict.py \
  --prev_temp_m7 28.1 \
  --prev_sun_m7 78.0 \
  --temp_m7 28.2 \
  --sun_m7 72.0 \
  --ndvi_anom_m8 -0.315 \
  --prev_masting_beech 2.0 \
  --temp_m5 17.4 \
  --precip_m5 1004.3 \
  --sun_m5 70.0 \
  --temp_m8 27.6 \
  --precip_m8 1001.7 \
  --ndre_anom_m8 -0.225 \
  --prev_masting_oak 3.0 \
  --prev_fsi 1.0
```

#### 出力例:
```text
============================================================
 堅果類豊凶予測 ＆ クマ出没リスク（BORI）算出結果
============================================================
■ ブナ結実予測値 (b̂_t) : 0.852 / 3.000
■ ナラ結実予測値 (ô_t) : 1.103 / 3.000
------------------------------------------------------------
■ エサ不足指標 (FSI_t) : 4.045 / 6.000  (前年 FSI: 1.000)
■ 出没リスク指標 (BORI) : 20.141
■ 警戒レベル判定       : 特別警戒 (Severe Alert)
■ 状況説明             : 3樹種同調大凶作と前年個体数増が重なり、記録的な大量出没・人里侵入リスクが極めて高い状態です。
============================================================
```

---

## 📂 ディレクトリ構成

```text
.
├── README.md               # 本ドキュメント
├── requirements.txt        # 依存ライブラリ一覧
├── predict.py              # CLI推論スクリプト
├── fsi_bori.py             # FSI / BORI 計算コアモジュール
├── models/                 # 学習済みモデルファイル
│   ├── rf_beech.pkl        # scikit-learn ブナモデル
│   ├── rf_oak.pkl          # scikit-learn ナラ類モデル
│   ├── rf_beech.json       # JS用ブナ決定木構造
│   └── rf_oak.json         # JS用ナラ決定木構造
├── data/
│   └── sample_inputs.csv   # 過去の実績検証データ (2022-2025)
├── html/                   # GitHub Pages Webシミュレーター
│   ├── index.html          # シミュレーターUI
│   ├── style.css           # スタイルシート
│   ├── models_data.js      # ブラウザ用埋め込みモデル
│   └── simulator.js        # ブラウザ側推論エンジン
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages自動デプロイ設定
```

---

## 📄 ライセンス・引用

本リポジトリのプログラムコードは MIT License のもとで公開されています。

* **全国出没リスクマップ Web サービス**: [https://borimap.web.app](https://borimap.web.app)
* **研究代表者**: 文教大学付属高等学校 遠藤 最（2026年）
