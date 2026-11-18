# SoundCloud Client (非公式)

Tauri 2 (Rust) + React + [Primer React](https://primer.style/react) 製の非公式 SoundCloud クライアント。曲を検索して再生できる。

## 仕組み

- Rust 側 (`src-tauri/src/soundcloud.rs`) が soundcloud.com の JS バンドルから `client_id` を取得し、Web 版と同じ非公開 API `api-v2.soundcloud.com` を呼ぶ。フロントからは汎用コマンド `api` で任意の api-v2 パスを GET する (他ホストは拒否)。CORS を避けるため HTTP はすべて Rust 側で行う。
- 再生時はストリームを progressive mp3 → mp3 HLS → その他の暗号化なし HLS の順に選び、HLS はセグメントを連結して 1 ファイルにしてから WebView に渡す。DRM 付き (encrypted-hls) のみの曲は再生できない。
- 波形の下にタイムドコメントのアバターを並べ、再生位置が通過したコメントを 3 秒間吹き出しで表示する (アバターにホバーでも表示)。
- 波形シークバーをドラッグすると、デコード済み PCM を AudioWorklet (`src/scratch-worklet.js`) で読み出してレコードのスクラッチのように鳴らす。ドラッグ速度がそのまま再生速度・ピッチになり、逆方向に動かすと逆再生、止めると無音になる。トラックパッドの 2 本指横スワイプでも同じようにスクラッチ/シークできる (指を右へ動かすと先へ進む)。

## UI

- 検索: トラック / アーティスト / アルバム / プレイリストを切り替え。結果は無限スクロール (`next_href` を辿る)。
- アーティストページ: プロフィールとトラック・人気・アルバム・プレイリスト。
- トラックページ: 波形 (再生中ならスクラッチ可)・コメント一覧 (無限スクロール)・関連トラック。
- アルバム / プレイリストページ: 全曲 (埋め込みが省略された曲は `/tracks?ids=` で補完)。
- 曲名でトラックページ、アーティスト名でアーティストページへ移動。戻る (← ボタン / Alt+← / ⌘[ / マウスの戻るボタン) は前のページの内容とスクロール位置を保つ。
- 下部の固定プレイヤーバー (前/再生/次・タイムライン・音量)。再生したリストがキューになり、曲が終わると次へ進む。Space キーで再生/一時停止。ライト/ダークは OS 設定に追従する。

## 開発

前提: Rust, Node.js, [Tauri の OS 依存パッケージ](https://tauri.app/start/prerequisites/)。Linux では mp3/AAC 再生に GStreamer プラグイン (`gst-plugins-good` / `gst-plugins-bad` / `gst-libav` 等) も必要。

```bash
npm install
npm run tauri dev
```

```bash
cd src-tauri && cargo test
```

```bash
npm test
```

## 注意

非公式 API の利用は SoundCloud の利用規約に抵触しうる。個人利用の範囲に留めること。API の仕様変更で予告なく動かなくなる可能性がある。
