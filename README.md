# WebVST Boilerplate

MoonBit DSP (WASM) + WAMR AOT Runtime + JUCE + React Web UI による
オーディオプラグイン (VST3) ボイラープレート。

## 設計原則: C++ を触らない開発体験

パラメータ追加・DSP変更・UI変更で C++ コードの修正が不要。

```
パラメータ追加時の作業:
  1. MoonBit: params.mbt にパラメータ定義を追加 → ✅ これだけ
  2. React: UI コンポーネントを追加/変更 → ✅ これだけ
  3. C++: 変更不要 ✅
```

## アーキテクチャ

```
DAW → JUCE PluginProcessor → WASM DSP (WAMR AOT) → Audio Output
                ↕
       PluginEditor (WebView)
                ↕
         React UI (generic param API)
```

- WASM DSP が自身のパラメータ情報をエクスポート
- C++ は init 時に WASM からパラメータ一覧を動的に取得
- JUCE AudioParameterFloat と WebSliderRelay を自動生成
- UI は汎用的なパラメータ API 経由で通信

## 必要環境

- [MoonBit](https://www.moonbitlang.com/) CLI
- [Node.js](https://nodejs.org/) 20+
- CMake 3.22+
- C++17 対応コンパイラ (MSVC / Clang / GCC)

### Windows 追加要件
- Visual Studio 2022 (MSVC)

### macOS 追加要件
- Xcode Command Line Tools
- [Homebrew](https://brew.sh/)

> LLVM (wamrc ビルドに必要) はセットアップスクリプトが自動でインストールします。

## セットアップ

```bash
# 1. リポジトリクローン (サブモジュール含む)
git clone --recursive https://github.com/kogum4/moonvst
cd moonvst

# 2. プラットフォームセットアップ
# macOS:
./scripts/setup-macos.sh
# Windows (PowerShell):
.\scripts\setup-windows.ps1
```

## 開発ワークフロー

### Web 開発モード (推奨、ホットリロード対応)

```bash
npm run dev
```

MoonBit DSP + Vite dev server が並列起動。
ブラウザで `http://localhost:5173` を開いて開発。

### Native プラグイン開発

```bash
npm run build:dsp          # WASM → AOT
npm run build:ui           # React → single-file HTML
npm run configure:plugin   # CMake 構成 (初回のみ)
npm run build:plugin       # CMake Release ビルド
```

### リリースビルド

```bash
npm run release:vst   # 全パイプライン実行
```

## ディレクトリ構成

```
webvst-boilerplate/
├── dsp/                # MoonBit DSP ★主に編集するレイヤー
│   └── src/
│       ├── params.mbt  # ★パラメータ定義 (ここに1行足すだけ)
│       ├── lib.mbt     # DSP 処理ロジック
│       └── exports.mbt # 汎用パラメータ API
├── plugin/             # JUCE C++ プラグイン (原則いじらない)
├── ui/                 # React Web UI ★主に編集するレイヤー
│   └── src/
│       ├── components/ # UI コンポーネント
│       ├── runtime/    # JUCE / Web Audio ランタイム抽象
│       └── hooks/      # React Hooks
├── scripts/            # ビルド・セットアップスクリプト
├── libs/               # Git サブモジュール (JUCE, WAMR)
└── tests/              # テスト
```

## パラメータの追加方法

### 1. MoonBit (dsp/src/params.mbt)

```moonbit
let param_defs : Array[ParamDef] = [
  { name: "gain", min: 0.0, max: 1.0, default_val: 0.5 },
  { name: "mix", min: 0.0, max: 1.0, default_val: 1.0 },  // ← 追加
]

let param_values : Array[Float] = [0.5, 1.0]  // ← デフォルト値追加
```

### 2. DSP ロジック (dsp/src/lib.mbt)

```moonbit
fn process_audio(num_samples : Int) -> Unit {
  let gain = param_values[0]
  let mix = param_values[1]  // ← 新パラメータを使用
  // ...
}
```

### 3. React UI (ui/src/components/)

```tsx
function MixSlider({ runtime }: { runtime: AudioRuntime }) {
  const { value, set, info } = useParam(runtime, "mix")
  if (!info) return null
  return <input type="range" min={info.min} max={info.max}
                step={0.01} value={value} onChange={e => set(+e.target.value)} />
}
```

**C++ の変更は不要。**

## プラットフォーム対応

| 項目 | macOS | Windows |
|------|-------|---------|
| WAMR ライブラリ | `libiwasm.a` | `iwasm.lib` |
| プラグイン形式 | VST3, AU, Standalone | VST3, Standalone |
| WebView | WebKit | WebView2 (Edge) |

## ライセンス

MIT
