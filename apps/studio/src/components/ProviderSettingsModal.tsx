import { useState } from 'react';
import { X, Server, CheckCircle2 } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export function ProviderSettingsModal() {
  const settingsOpen = useStudioStore((s) => s.settingsOpen);
  const setSettingsOpen = useStudioStore((s) => s.setSettingsOpen);
  const providerStatus = useStudioStore((s) => s.providerStatus);
  const comfyReachable = useStudioStore((s) => s.comfyReachable);
  const comfyCheckpoints = useStudioStore((s) => s.comfyCheckpoints);
  const comfyLoras = useStudioStore((s) => s.comfyLoras);
  const a1111Reachable = useStudioStore((s) => s.a1111Reachable);
  const ollamaReachable = useStudioStore((s) => s.ollamaReachable);
  const ollamaModels = useStudioStore((s) => s.ollamaModels);
  const saveProviderConfig = useStudioStore((s) => s.saveProviderConfig);

  const [comfyuiUrl, setComfyuiUrl] = useState(providerStatus?.comfyuiUrl || 'http://127.0.0.1:8188');
  const [a1111Url, setA1111Url] = useState(providerStatus?.a1111Url || 'http://127.0.0.1:7860');
  const [ollamaUrl, setOllamaUrl] = useState(providerStatus?.ollamaUrl || 'http://127.0.0.1:11434');
  const [ollamaModel, setOllamaModel] = useState(providerStatus?.ollamaModel || 'llama3.2');
  const [huggingfaceToken, setHuggingfaceToken] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [falApiKey, setFalApiKey] = useState('');

  if (!settingsOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Record<string, string> = { comfyuiUrl, a1111Url, ollamaUrl, ollamaModel };
    if (huggingfaceToken.trim()) patch.huggingfaceToken = huggingfaceToken.trim();
    if (openaiApiKey.trim()) patch.openaiApiKey = openaiApiKey.trim();
    if (geminiApiKey.trim()) patch.geminiApiKey = geminiApiKey.trim();
    if (falApiKey.trim()) patch.falApiKey = falApiKey.trim();
    await saveProviderConfig(patch);
    setSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSave}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-[#10141f] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Server className="h-4 w-4 text-sky-400" />
            Açık Kaynak Yerel & Bulut AI Sağlayıcıları
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2.5 text-[11px] text-sky-200">
            <strong>Ücretsiz Açık AI Hazır:</strong> Pollinations Flux/Turbo varsayılan olarak anahtarsız çalışır.
            İsterseniz yerel GPU sunucularınızı (ComfyUI / A1111 / Ollama) aşağıdan bağlayabilirsiniz.
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-1 flex items-center justify-between font-semibold text-slate-200">
              <span>Yerel ComfyUI</span>
              <span className={comfyReachable ? 'text-emerald-400' : 'text-slate-400'}>
                {comfyReachable
                  ? `Bağlı (${comfyCheckpoints.length} ckpt, ${comfyLoras.length} LoRA)`
                  : 'Erişilemedi'}
              </span>
            </div>
            <input
              type="text"
              value={comfyuiUrl}
              onChange={(e) => setComfyuiUrl(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-1 flex items-center justify-between font-semibold text-slate-200">
              <span>Yerel Automatic1111 / Forge</span>
              <span className={a1111Reachable ? 'text-emerald-400' : 'text-slate-400'}>
                {a1111Reachable ? 'Bağlı' : 'Erişilemedi'}
              </span>
            </div>
            <input
              type="text"
              value={a1111Url}
              onChange={(e) => setA1111Url(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div>
              <label className="mb-1 block text-slate-400">
                Ollama URL {ollamaReachable ? `(${ollamaModels.length} model)` : ''}
              </label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-slate-400">Ollama Modeli</label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="font-semibold text-slate-200">Opsiyonel API Anahtarları (Oturum Bellekli)</div>
            <label className="block">
              <span className="text-slate-400">
                Hugging Face Token (HF_TOKEN) {providerStatus?.huggingfaceTokenConfigured ? '✓ Aktif' : ''}
              </span>
              <input
                type="password"
                placeholder="hf_..."
                value={huggingfaceToken}
                onChange={(e) => setHuggingfaceToken(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-slate-400">
                OpenAI API Key {providerStatus?.openaiApiKeyConfigured ? '✓ Aktif' : ''}
              </span>
              <input
                type="password"
                placeholder="sk-..."
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-slate-400">
                Google Gemini API Key {providerStatus?.geminiApiKeyConfigured ? '✓ Aktif' : ''}
              </span>
              <input
                type="password"
                placeholder="AIza..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-slate-400">
                Fal.ai Key {providerStatus?.falApiKeyConfigured ? '✓ Aktif' : ''}
              </span>
              <input
                type="password"
                placeholder="key_..."
                value={falApiKey}
                onChange={(e) => setFalApiKey(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Kaydet ve Test Et
          </button>
        </div>
      </form>
    </div>
  );
}
