# [計画] 印刷レイアウトのズレ修正と最適化

ブラウザ上の表示は綺麗でも、印刷物（プレビュー）でレイアウトが崩れたり縦に間延びしたりする問題を修正します。

## 成功の基準
- [ ] 印刷用クローンにモーダル背景などの不要な要素が含まれていない。
- [ ] 印刷用カードのサイズが A5横（210mm x 148.5mm）に完璧に固定されている。
- [ ] A4縦で印刷した際、上半分にカードが配置され、下半分が空白になる。
- [ ] チェックマークが文字を隠さず、かつ枠を広げない。

## 根本原因の分析
1. **不要な要素の混入**: `cloneNode(true)` で ID `modal-stamp-card` をコピーしているが、セレクタが重複しているか、クローン時に不要なラッパーが含まれている可能性がある。
2. **Bodyの高さ制限**: `body.printing-stamp-card` に `height: 148.5mm` を設定しているため、A4縦で印刷しようとするとブラウザが混乱し、レイアウトが崩れている。
3. **グリッドの伸縮**: カード内部の要素が `flex-grow` 等で不必要に縦に伸びている。

## 修正タスク

### 1. 印刷用クローンロジックの改善
- [ ] `DispenseModal.jsx` および `RegisterTab.jsx` の `handlePrint`:
    - クローンする対象をより厳密に特定。
    - クローン追加前にクリーンアップ（既存のクローンがあれば削除）。

### 2. CCSの最終調整 (index.css)
- [ ] `body.printing-stamp-card`: `height: 148.5mm` を削除し、必要に応じて `min-height: 100vh` 等にする。
- [ ] `#stamp-card-print-clone`: 
    - `width: 210mm !important; height: 148.5mm !important;` を維持。
    - `overflow: hidden` を徹底し、はみ出しをカット。
    - 背景色を白に固定。

### 3. StampCard コンポーネントの調整 (StampCard.jsx)
- [ ] 内部の `grid` と `stamp-container` の高さを数値を指定して固定（例: `h-16` など）。
- [ ] 文字サイズが大きすぎないように再調整。

## 検証フロー (Orchestration)
1. **Frontend-Specialist**: CSS と JSX の修正を適用。
2. **Debugger/Explorer**: 修正後の DOM 構造と計算済みスタイルをスクショで確認。
3. **Test-Engineer**: 実際に A4 印刷ダイアログを模した状態でのレイアウト整合性を確認。
