# Alpemox Creative Suite

**Alpemox** (`alpemox.com` / `alpemox.dev`), açık kaynaklı (**AGPL-3.0-only**) **2D/3D Hibrit AI Yaratıcı Stüdyo, Fotoğraf, Vektör, Video/Animasyon, Launcher & MCP Platformu**dur.

Mimari ve çalışma alanı yaklaşımı [ArtCraft](https://github.com/storytold/artcraft) (MIT / Apache-2.0) açık kaynak projesinden ilham alır; atıf ve marka sınırları [NOTICE](NOTICE) dosyasında yer alır.

## Suite Uygulamaları (7 Modül)
- **Alpemox Studio (Hybrid 2D + 3D + AI):** Three.js 3D sahne + 2D katmanlı kanvas + çift yönlü **RGB + Depth → AI → Billboard** köprüsü.
- **Alpemox Photo:** Çok katmanlı raster düzenleme, Inpaint maske (`Ters Maske`), kenar/arka plan araçları (`BG Sil`, `Kenar`), histogram, `Birleştir`, `Kırp`, `LUT` & stil önayarları, sürükle-bırak görsel açma.
- **Alpemox Vector:** Smooth Cubic Bezier kalem, sürüklenebilir anchor noktaları, `Kutu`, `Elips`, `Yıldız`, `Poligon`, `Çizgi`, CSS keyframe animasyonlu SVG çıktısı (`Nabız`, `Döndür`, `Yüzdür`) ve **3D Extrude**.
- **Alpemox Film:** Çok kanallı `V1 + A1` zaman çizelgesi, `16:9 / 9:16 / 1:1` oran seçimi, hareket presetleri (`Ken Burns`, `Pan`, `Float`, `Bounce`), yazı animasyonları (`Daktilo`, `Pop`), AI Synth ses miksajlı `.webm` dışa aktarım ve `AI Kare Doldur`.
- **Alpemox 3D Stage:** Pozlanabilir eklemli 3D mankenler, `TransformControls` gizmo, **PBR Materyal** sürgüleri (`Pürüzlülük`, `Metalik`, `Emissive`), tek tık **4 Açı Turnaround Grid**, Heightmap `3D Kabartma` ve `.GLB/.OBJ` dışa aktarım.
- **Alpemox Moodboard:** Sürüklenebilir görsel, yönetmen notu ve renk paleti panosu.
- **Alpemox Nodes & MCP:** Sürükle-bırak görsel AI workflow grafiği (`.alpemox-flow.json`), `stdio` **MCP Sunucusu** (`npm run mcp`), CLI (`npm run cli`) ve canlı WebSocket senkronizasyonu.

## Yerel AI & Ekosistem
- **Open Suite (AGPL-3.0):** Tüm editörler, `1x–4x` varyasyon, `720p/1080p/4K` yerel çıktı ve indirilebilir `.ZIP` varlık/LUT/flow paketleri yerelde ücretsiz ve kilitsizdir.
- **Desteklenen Motorlar:** Anahtarsız ücretsiz **Pollinations FLUX / Sana**, yerel **ComfyUI** (otomatik checkpoint & LoRA keşfi), **Automatic1111 / Forge**, **Ollama**, ayrıca opsiyonel **OpenAI / Gemini / Fal.ai** BYOK + **Procedural Offline Preview**.
- **Alpemox Cloud (Yakında):** Yönetilen bulut GPU, takım alanları ve 4K sunucu renderı için bekleme listesi (`/api/cloud/waitlist`) + topluluk özellik isteği panosu (`/api/requests`).

## Kurulum ve Çalıştırma
```bash
npm install
npm run build
npm test
```

Tek sunucu (Üretim Web Sitesi + Launcher + Stüdyo + API/WS):
```bash
node apps/server/src/index.mjs
```
- **Web Sitesi:** `http://localhost:4310/`
- **Launcher:** `http://localhost:4310/?page=launcher`
- **Stüdyo:** `http://localhost:4310/?page=studio`
- **Geliştirme Modu:** `npm run dev` (Vite `5173` + Server `4310`)

## MCP İstemcisine Bağlama
```json
{
  "mcpServers": {
    "alpemox": {
      "command": "node",
      "args": ["<ALPEMOX_KLASORU>/packages/mcp/bin/opencraft-mcp.mjs"],
      "env": {
        "OPENCRAFT_SERVER_URL": "http://127.0.0.1:4310"
      }
    }
  }
}
```
