---
title: "feat: High-Quality Effects DSP Porting Sources"
type: feat
status: active
date: 2026-02-21
---

# High-Quality Effects DSP Porting Sources

## Overview

`packages/dsp-core/src/effects/` に7種のエフェクトを実装する。現在、Chorus・Distortion・Reverb は高品質な OSS からの移植済みだが、Compressor・Delay・EQ・Filter はプレースホルダー品質。本計画では各エフェクトの移植元 OSS を選定する。

## Current State Assessment

| Effect | Current Quality | Current Origin | Upgrade Needed? |
|--------|----------------|----------------|-----------------|
| **Chorus** | High | Airwindows (MIT) | No |
| **Compressor** | Toy (24行, 静的ゲインリダクションのみ, エンベロープなし) | オリジナル | **Yes** |
| **Delay** | Toy (20行, ディレイラインバッファなし) | オリジナル | **Yes** |
| **Distortion** | High | Airwindows HardVacuum (MIT) | No |
| **EQ** | Toy (14行, トーンコントロールのみ, パラメトリックEQではない) | オリジナル | **Yes** |
| **Filter** | Toy (16行, 1-pole LPF, 真のレゾナンスなし) | オリジナル | **Yes** |
| **Reverb** | High | Dattorro plate reverb (public domain algorithm) | No |

---

## Porting Source Recommendations

### 1. Compressor

#### Primary: velipso/sndfilter (Chromium-derived)

| Field | Detail |
|---|---|
| **Repository** | https://github.com/velipso/sndfilter |
| **Source File** | `src/compressor.c` (~353 lines) |
| **License** | **0BSD** (Zero-Clause BSD, 事実上パブリックドメイン) |
| **Language** | Pure C, 依存なし |
| **Algorithm** | WebAudio DynamicsCompressorNode spec 準拠のフィードフォワードコンプレッサー |

**Topology:**
1. Pregain stage
2. Peak envelope detector (attack/release 分離)
3. Soft-knee compression curve (3領域: below threshold / in knee / above threshold)
4. Adaptive release (4ゾーン cubic polynomial)
5. Gain smoothing (`asin`-shaped scaling)
6. Predelay buffer (最大1024サンプル lookahead)
7. Automatic makeup gain: `powf(1.0f / fulllevel, 0.6f)`
8. Wet/dry mix

**Parameters:** pregain (dB), threshold (dB), knee (dB), ratio, attack (sec), release (sec), predelay (sec), postgain (dB), wet

**Key formulas:**
```
// Soft-knee compression curve
if (2 * (x - threshold) < -knee):
    output = x
elif (2 * abs(x - threshold) <= knee):
    output = x + (1/ratio - 1) * (x - threshold + knee/2)^2 / (2 * knee)
else:
    output = threshold + (x - threshold) / ratio

// Envelope detector
alpha_A = exp(-1 / (sample_rate * attack_time))
alpha_R = exp(-1 / (sample_rate * release_time))
```

**Why this:** 0BSD ライセンスで帰属表示不要。Chromium/Blink 由来で数十億デバイスで検証済み。Sample-by-sample 処理可能。Pure C で MoonBit への移植が直接的。

#### Alternative: Airwindows Pressure5 (character compressor)

| Field | Detail |
|---|---|
| **Repository** | https://github.com/airwindows/airwindows |
| **Path** | `plugins/LinuxVST/src/Pressure5/Pressure5Proc.cpp` |
| **License** | **MIT** |
| **Algorithm** | Vari-mu style compressor with mewiness/PawClaw character controls |

**Note:** 標準的な threshold/ratio/attack/release パラメータではなく、独自の「Mewiness」「PawClaw」パラメータ体系。セカンドコンプレッサー（キャラクター系）として検討。

#### Academic Reference: Giannoulis/Massberg/Reiss (JAES 2012)

**Paper:** "Digital Dynamic Range Compressor Design -- A Tutorial and Analysis"
**URL:** https://www.eecs.qmul.ac.uk/~josh/documents/2012/GiannoulisMassbergReiss-dynamicrangecompression-JAES2012.pdf

公開された学術論文のアルゴリズムは自由に実装可能。sndfilter は本質的にこのアルゴリズムのクリーンな実装。

---

### 2. Delay

#### Primary: Airwindows TapeDelay2

| Field | Detail |
|---|---|
| **Repository** | https://github.com/airwindows/airwindows |
| **Path** | `plugins/WinVST/TapeDelay2/TapeDelay2Proc.cpp` |
| **License** | **MIT** |
| **Lines** | ~300 lines DSP |
| **Algorithm** | Tape-style variable-speed delay with filtered feedback |

**Topology:**
1. Circular buffer (88,200 samples/ch, 2秒@44.1kHz)
2. Floating-point position による variable-speed playback
3. Feedback loop with biquad bandpass filter (regen filter)
4. Output biquad filter (Q は regen filter の黄金比倍)
5. Sine-wave flutter modulation (入力エンベロープで変調)
6. Multi-rate 動作 (44.1kHz 基準、高サンプルレートではN倍アンダーサンプリング)

**Parameters:** Speed (delay time), Feedback, Filter Frequency, Filter Q, Flutter, Wet/Dry

**Why this:** MIT ライセンス。既存の Chorus 移植と完全に同じパターン (`gcount` 式インデックス, WASM リニアメモリレイアウト, `@utils.alloc_f32_samples`)。Feedback path の biquad フィルタがテープエコーの自然な高域減衰を再現。

#### Building Block Reference: Dplug Delayline

| Field | Detail |
|---|---|
| **Repository** | https://github.com/AuburnSounds/Dplug |
| **Path** | `dsp/dplug/dsp/delayline.d` |
| **License** | **BSL-1.0** (Boost Software License) |
| **Algorithm** | Twin-write delay line with Hermite/cubic spline interpolation |

高品質補間が必要な場合の参考実装。

---

### 3. EQ (Parametric Equalizer)

#### Primary: Cytomic TPT SVF (Bell/Shelf cascade)

| Field | Detail |
|---|---|
| **Reference Paper** | https://cytomic.com/technical-papers/ (SvfLinearTrapOptimised2.pdf) |
| **Author** | Andrew Simper (Cytomic) |
| **Paper License** | **Public Domain** ("Knowledge placed in the public domain") |
| **Best Code Source** | https://github.com/FredAntonCorvest/Common-DSP (**MIT**) |
| **Alt Code Source** | https://gist.github.com/hollance/2891d89c57adc71d9560bcf0e1e55c4b (**WTFPL**) |
| **Algorithm** | State Variable Filter with linear trapezoidal integration |

**Architecture:** 3-5個の SVF インスタンスを直列接続
- Band 1: Low Shelf SVF
- Band 2-3: Bell (Peaking) SVF
- Band 4: High Shelf SVF

**Per-sample processing (全フィルタタイプ共通):**
```
v3    = v0 - ic2eq
v1    = a1 * ic1eq + a2 * v3
v2    = ic2eq + a2 * ic1eq + a3 * v3
ic1eq = 2 * v1 - ic1eq
ic2eq = 2 * v2 - ic2eq
output = m0 * v0 + m1 * v1 + m2 * v2
```

フィルタタイプごとに m0/m1/m2 のみ異なる。Bell band の場合:
```
A  = 10^(dBgain/40)
g  = tan(pi * freq / sampleRate)
k  = 1 / (Q * A)
a1 = 1 / (1 + g*(g + k))
a2 = g * a1
a3 = g * a2
m0 = 1,  m1 = k*(A*A - 1),  m2 = 0
```

**Why this:** Biquad より数値安定性が高く、状態変数が少ない (2個/band vs 4個)。高周波での係数量子化問題なし。パラメータ変調時にジッパーノイズなし。

**State per band:** ic1eq, ic2eq (2 floats) + 6 coefficients = 8 values
**Total for 4-band EQ:** 32 floats + shared sample rate
**Porting effort:** ~100 lines MoonBit

#### Alternative: RBJ Audio EQ Cookbook Biquad

| Field | Detail |
|---|---|
| **Reference** | https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html |
| **Author** | Robert Bristow-Johnson |
| **License** | Public reference document |
| **Best Code Source** | https://www.earlevel.com/main/2012/11/26/biquad-c-source-code/ (permissive) |

業界標準の biquad 実装。SVF の代替として、より広く知られたアプローチ。

---

### 4. Filter (Resonant SVF)

#### Primary: Cytomic TPT SVF (LP/HP/BP modes)

EQ と同じアルゴリズムを LP/HP/BP/Notch モードで使用。

| Field | Detail |
|---|---|
| **Code Source** | https://github.com/FredAntonCorvest/Common-DSP (**MIT**) |
| **Algorithm** | Topology-Preserving Transform State Variable Filter |
| **Filter Types** | LP, HP, BP, Notch, Peak, All-pass |
| **State Variables** | 2 only: ic1eq, ic2eq |

LP mode の場合:
```
g = tan(pi * cutoff / sampleRate)
k = 2.0 - 2.0 * resonance  // resonance 0..1
a1 = 1 / (1 + g*(g + k))
a2 = g * a1
a3 = g * a2
m0 = 0, m1 = 0, m2 = 1  // lowpass output
```

**Why this:** 現在の 1-pole LPF を真の 2-pole SVF に置換。レゾナンス (self-oscillation 可能)、LP/HP/BP/Notch のマルチモード。モジュレーション耐性が最高。

**Porting effort:** ~60 lines core + ~40 lines coefficient setup

#### Character Option: Krajeski Moog Ladder Filter

| Field | Detail |
|---|---|
| **Repository** | https://github.com/ddiakopoulos/MoogLadders |
| **Path** | `src/KrajeskiModel.h` |
| **License** | **Unlicense** (パブリックドメイン相当) |
| **Algorithm** | 4-pole ladder filter with tanh nonlinearity |
| **Lines** | ~30 lines core DSP |

クラシックな Moog-style 4-pole フィルタ。Self-oscillation 可能。キャラクター系フィルタとして追加検討。

---

### 5. Chorus (No Change)

| Field | Detail |
|---|---|
| **Current Source** | Airwindows Chorus (MIT) |
| **Status** | Already ported and working |
| **File** | `packages/dsp-core/src/effects/chorus.mbt` (411 lines) |

### 6. Distortion (No Change)

| Field | Detail |
|---|---|
| **Current Source** | Airwindows HardVacuum (MIT) |
| **Status** | Already ported and working |
| **File** | `packages/dsp-core/src/effects/distortion.mbt` (173 lines) |

### 7. Reverb (No Change)

| Field | Detail |
|---|---|
| **Current Source** | Dattorro plate reverb (public domain algorithm) |
| **Status** | Already ported and working |
| **File** | `packages/dsp-core/src/effects/reverb_dattorro.mbt` (432 lines) |

---

## License Summary

| Effect | Porting Source | License (SPDX) | Attribution Required |
|--------|---------------|-----------------|---------------------|
| Chorus | Airwindows | MIT | Yes (copyright notice) |
| **Compressor** | velipso/sndfilter | **0BSD** | **No** |
| **Delay** | Airwindows TapeDelay2 | **MIT** | Yes (copyright notice) |
| Distortion | Airwindows HardVacuum | MIT | Yes (copyright notice) |
| **EQ** | Cytomic SVF (FredAntonCorvest) | **MIT** | Yes (copyright notice) |
| **Filter** | Cytomic SVF (FredAntonCorvest) | **MIT** | Yes (copyright notice) |
| Reverb | Dattorro algorithm | Public domain | No |

全て MIT / 0BSD / Public Domain。GPL/LGPL なし。

---

## Implementation Priority

1. **Filter** (SVF) - 最小 (~60 lines)。EQ の基盤にもなる。
2. **EQ** (SVF cascade) - Filter の SVF を再利用して 3-4 band パラメトリック EQ を構築。
3. **Compressor** (sndfilter) - 中規模 (~150 lines core)。エンベロープフォロワー + soft knee。
4. **Delay** (TapeDelay2) - 最大 (~300 lines)。Chorus と同じ WASM メモリパターンで実装。

## Key References

- [Airwindows GitHub (MIT)](https://github.com/airwindows/airwindows)
- [velipso/sndfilter (0BSD)](https://github.com/velipso/sndfilter)
- [Cytomic Technical Papers (Public Domain)](https://cytomic.com/technical-papers/)
- [FredAntonCorvest/Common-DSP (MIT)](https://github.com/FredAntonCorvest/Common-DSP)
- [Hollance Cytomic SVF Gist (WTFPL)](https://gist.github.com/hollance/2891d89c57adc71d9560bcf0e1e55c4b)
- [ddiakopoulos/MoogLadders (Unlicense)](https://github.com/ddiakopoulos/MoogLadders)
- [RBJ Audio EQ Cookbook (W3C)](https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html)
- [EarLevel Engineering Biquad](https://www.earlevel.com/main/2012/11/26/biquad-c-source-code/)
- [Giannoulis/Massberg/Reiss Compressor Paper (JAES 2012)](https://www.eecs.qmul.ac.uk/~josh/documents/2012/GiannoulisMassbergReiss-dynamicrangecompression-JAES2012.pdf)
- [Dplug Delayline (BSL-1.0)](https://github.com/AuburnSounds/Dplug)
