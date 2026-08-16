# 2026 英國 NICE 第 2 型糖尿病臨床決策輔助互動系統 (NG28)
### NICE NG28 (Updated 2026) Interactive Clinical Decision Support System (CDSS)

一套依據英國國家健康與照顧卓越研究院（NICE）2026 年最新修訂之 **NG28（Type 2 diabetes in adults: management）**、**NG128（腦中風急性診治）** 與 **NG236（腦中風復健）** 臨床指引所建構之現代化臨床決策輔助互動網站。

---

## 🌟 核心功能模組 (Key Interactive Modules)

1. **⚡ 一鍵處方計算器 (Interactive Rx Algorithm Engine)**
   - 根據病患年齡、BMI、eGFR、心衰竭（HFrEF/HFpEF）、動脈硬化心血管疾病（ASCVD）、腦中風（Stroke/TIA）、衰弱分期（Frailty）與吞嚥功能，即時推算 2026 NICE 首選處方。
   - 動態計算個人化糖化血色素（HbA1c）目標（6.5% vs 7.0% vs 7.5%~8.0%+）。
   - 自動判別是否符合 NICE 4 大連續血糖監測（CGM）公費/優先推薦指標。

2. **🪜 階梯調藥時程軸 (Stepwise Titration & Staging Timeline)**
   - 視覺化展示 Week 0（Metformin XR 500mg 起步）➔ Week 2~4（毫不延遲加上 SGLT-2 抑制劑）➔ Week 8~12（加用 GLP-1 RA / Tirzepatide）之標準滴定與避險路徑。

3. **🧪 慢性腎臟病 (CKD) 依 eGFR 分期處方地圖**
   - 聚焦 2026 重大突破：**eGFR 20～30 ml/min 仍可啟動/續用 SGLT-2 抑制劑（Dapagliflozin / Empagliflozin）護腎**，並停用 Metformin 改搭 DPP-4 抑制劑安全降糖。

4. **🚨 生病應變守則 (Sick Day Rules: SADMANS)**
   - 急性發燒、嘔吐、腹瀉脫水時之 **SADMANS** 藥物暫停清單與急診就醫紅旗警訊。

5. **🧠 腦中風與吞嚥障礙專題 (Stroke & Dysphagia Management)**
   - **重大用藥警語**：緩釋型 Metformin XR 嚴禁磨粉管灌！
   - 吞嚥困難與管灌患者之標準速效劑型磨粉、口服懸液劑與 DPP-4i 替換方案。
   - 缺血性腦中風二級預防四大支柱（Clopidogrel 75mg、高強度 Statin、達標降壓、GLP-1 RA 降中風）。

6. **🥗 糖尿病逆轉緩解計畫 (NHS Path to Remission)**
   - 12 週總代餐（TDR 800 kcal/day）➔ 食物重組 ➔ 長期體重維持三階段 SOP。

7. **📋 全人年度臨床品質稽核清單 (Annual Quality Standards & Audit)**
   - 整合 2026 牙周病口腔篩檢（治牙周病降 HbA1c 0.3%~0.4%）、眼底散瞳、足部 10g 尼龍線檢查、微量白蛋白尿（UACR）與一鍵列印/匯出報告功能。

---

## 🛠️ 技術架構 (Technology Stack)

- **前端核心**：HTML5 + 原生 Vanilla CSS + 原生 Vanilla JavaScript（無第三方龐大框架依賴，極速載入與流暢響應）。
- **設計系統**：現代醫療專業配色（Navy, Teal, Rose, Amber, Emerald, Purple）、卡片式微陰影、無障礙語意標籤與流暢動畫。
- **響應式支援**：完整支援桌上型電腦、平板與智慧型手機。

---

## 📖 參考文獻與指引依據 (References)

- **NICE Guideline NG28**: *Type 2 diabetes in adults: management* (Published: 02 December 2015, Last updated: February 2026).
- **NICE Guideline NG128**: *Stroke and transient ischaemic attack in over 16s: diagnosis and initial management*.
- **NICE Guideline NG236**: *Stroke rehabilitation in adults*.
- **NHS England**: *NHS Type 2 Diabetes Path to Remission Programme*.
