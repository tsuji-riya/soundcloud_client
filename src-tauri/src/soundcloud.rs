//! Minimal client for SoundCloud's undocumented api-v2 (the one soundcloud.com itself uses).

use reqwest::{Client, Response, StatusCode, Url};
use serde_json::Value;
use tokio::sync::Mutex;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

const API: &str = "https://api-v2.soundcloud.com";
const UA: &str = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

pub struct SoundCloud {
    http: Client,
    client_id: Mutex<Option<String>>,
}

impl SoundCloud {
    pub fn new() -> Self {
        let http = Client::builder().user_agent(UA).build().expect("http client");
        Self { http, client_id: Mutex::new(None) }
    }

    pub async fn search(&self, q: &str) -> Result<Value> {
        let mut res = self.get(&format!("{API}/search/tracks"), &[("q", q), ("limit", "30")]).await?;
        Ok(res["collection"].take())
    }

    /// Downloads the full audio of a track (mp3 or fragmented mp4).
    pub async fn audio(&self, track_id: u64) -> Result<Vec<u8>> {
        let track = self.get(&format!("{API}/tracks/{track_id}"), &[]).await?;
        let t = pick_transcoding(&track["media"]["transcodings"])
            .ok_or("再生可能なストリームがありません (DRM専用または非公開の可能性)")?;
        let auth = track["track_authorization"].as_str().unwrap_or_default();
        let res = self.get(t["url"].as_str().unwrap_or_default(), &[("track_authorization", auth)]).await?;
        let url = res["url"].as_str().ok_or("stream URL missing")?;

        if t["format"]["protocol"] == "progressive" {
            return self.bytes(url).await;
        }
        // HLS: (init segment +) media segments concatenated form a plain playable file.
        // shortcut: segments are fetched sequentially and fully before playback; parallelize/stream if start latency matters.
        let playlist = self.http.get(url).send().await?.error_for_status()?.text().await?;
        let mut out = Vec::new();
        for seg in segment_urls(&Url::parse(url)?, &playlist)? {
            out.extend(self.bytes(seg.as_str()).await?);
        }
        Ok(out)
    }

    async fn bytes(&self, url: &str) -> Result<Vec<u8>> {
        Ok(self.http.get(url).send().await?.error_for_status()?.bytes().await?.to_vec())
    }

    /// GET with client_id; retries once with a freshly scraped id when the cached one expired.
    async fn get(&self, url: &str, query: &[(&str, &str)]) -> Result<Value> {
        let mut res = self.send(url, query, false).await?;
        if matches!(res.status(), StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) {
            res = self.send(url, query, true).await?;
        }
        Ok(res.error_for_status()?.json().await?)
    }

    async fn send(&self, url: &str, query: &[(&str, &str)], refresh: bool) -> Result<Response> {
        let id = self.client_id(refresh).await?;
        Ok(self.http.get(url).query(query).query(&[("client_id", id)]).send().await?)
    }

    /// The web app's client_id is embedded in one of its JS bundles.
    async fn client_id(&self, refresh: bool) -> Result<String> {
        let mut cached = self.client_id.lock().await;
        if refresh {
            *cached = None;
        }
        if let Some(id) = cached.as_ref() {
            return Ok(id.clone());
        }
        let html = self.http.get("https://soundcloud.com/").send().await?.error_for_status()?.text().await?;
        // It is usually in one of the last bundles.
        for url in script_urls(&html).into_iter().rev() {
            let js = self.http.get(url).send().await?.text().await?;
            if let Some(id) = find_client_id(&js) {
                *cached = Some(id.clone());
                return Ok(id);
            }
        }
        Err("soundcloud.com から client_id を取得できませんでした".into())
    }
}

fn script_urls(html: &str) -> Vec<&str> {
    html.split("src=\"")
        .skip(1)
        .filter_map(|s| s.split('"').next())
        .filter(|u| u.starts_with("https://a-v2.sndcdn.com/assets/") && u.ends_with(".js"))
        .collect()
}

/// Matches `client_id:"<32 alnum>"` / `client_id="..."` / `client_id=...`.
fn find_client_id(js: &str) -> Option<String> {
    js.match_indices("client_id").find_map(|(i, m)| {
        let rest = js[i + m.len()..].trim_start_matches([':', '=', '"']);
        let id: String = rest.chars().take_while(char::is_ascii_alphanumeric).collect();
        (id.len() == 32).then_some(id)
    })
}

/// Prefers progressive mp3, then mp3 HLS, then any other unencrypted HLS.
fn pick_transcoding(transcodings: &Value) -> Option<&Value> {
    transcodings.as_array()?.iter().filter_map(|t| {
        let proto = t["format"]["protocol"].as_str()?;
        let mpeg = t["format"]["mime_type"] == "audio/mpeg";
        match proto {
            "progressive" => Some((0, t)),
            "hls" if mpeg => Some((1, t)),
            "hls" => Some((2, t)), // encrypted-hls / ctr-encrypted-hls (DRM) are excluded
            _ => None,
        }
    }).min_by_key(|(rank, _)| *rank).map(|(_, t)| t)
}

fn segment_urls(base: &Url, playlist: &str) -> Result<Vec<Url>> {
    playlist.lines().filter_map(|l| {
        let l = l.trim();
        let uri = match l.strip_prefix("#EXT-X-MAP:") {
            Some(attrs) => attrs.split("URI=\"").nth(1)?.split('"').next()?,
            None if l.is_empty() || l.starts_with('#') => return None,
            None => l,
        };
        Some(base.join(uri).map_err(Into::into))
    }).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn finds_client_id() {
        let id = "a".repeat(16) + &"B1".repeat(8);
        assert_eq!(find_client_id(&format!("x={{client_id:\"{id}\",env:1}}")), Some(id.clone()));
        assert_eq!(find_client_id(&format!("?client_id={id}&x")), Some(id));
        assert_eq!(find_client_id("client_id:\"short\""), None);
    }

    #[test]
    fn extracts_scripts() {
        let html = r#"<script src="https://a-v2.sndcdn.com/assets/1.js"></script><script src="/x.js"></script>"#;
        assert_eq!(script_urls(html), vec!["https://a-v2.sndcdn.com/assets/1.js"]);
    }

    #[test]
    fn picks_best_transcoding() {
        let t = json!([
            {"url": "drm", "format": {"protocol": "ctr-encrypted-hls", "mime_type": "audio/mp4"}},
            {"url": "aac", "format": {"protocol": "hls", "mime_type": "audio/mp4; codecs=\"mp4a.40.2\""}},
            {"url": "mp3", "format": {"protocol": "hls", "mime_type": "audio/mpeg"}},
        ]);
        assert_eq!(pick_transcoding(&t).unwrap()["url"], "mp3");
        assert!(pick_transcoding(&json!([t[0]])).is_none());
    }

    #[test]
    fn parses_playlist() {
        let base = Url::parse("https://cdn.example/a/playlist.m3u8").unwrap();
        let pl = "#EXTM3U\n#EXT-X-MAP:URI=\"init.mp4\"\n#EXTINF:10,\nhttps://cdn.example/s/0.m4s\n#EXTINF:10,\nseg1.m4s\n#EXT-X-ENDLIST\n";
        let urls: Vec<String> = segment_urls(&base, pl).unwrap().iter().map(Url::to_string).collect();
        assert_eq!(urls, ["https://cdn.example/a/init.mp4", "https://cdn.example/s/0.m4s", "https://cdn.example/a/seg1.m4s"]);
    }
}
