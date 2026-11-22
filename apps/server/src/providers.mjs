import crypto from 'node:crypto';

export class ProviderHub {
  constructor(initialEnv = process.env) {
    this.config = {
      comfyuiUrl: initialEnv.COMFYUI_URL || 'http://127.0.0.1:8188',
      a1111Url: initialEnv.A1111_URL || 'http://127.0.0.1:7860',
      ollamaUrl: initialEnv.OLLAMA_URL || 'http://127.0.0.1:11434',
      ollamaModel: initialEnv.OLLAMA_MODEL || 'llama3.2',
      huggingfaceToken: initialEnv.HF_TOKEN || '',
      openaiApiKey: initialEnv.OPENAI_API_KEY || '',
      geminiApiKey: initialEnv.GEMINI_API_KEY || '',
      falApiKey: initialEnv.FAL_KEY || '',
    };
  }

  getPublicStatus() {
    return {
      comfyuiUrl: this.config.comfyuiUrl,
      a1111Url: this.config.a1111Url,
      ollamaUrl: this.config.ollamaUrl,
      ollamaModel: this.config.ollamaModel,
      huggingfaceTokenConfigured: Boolean(this.config.huggingfaceToken),
      openaiApiKeyConfigured: Boolean(this.config.openaiApiKey),
      geminiApiKeyConfigured: Boolean(this.config.geminiApiKey),
      falApiKeyConfigured: Boolean(this.config.falApiKey),
    };
  }

  updateConfig(patch = {}) {
    if (typeof patch.comfyuiUrl === 'string' && patch.comfyuiUrl.trim()) {
      this.config.comfyuiUrl = patch.comfyuiUrl.trim().replace(/\/$/, '');
    }
    if (typeof patch.a1111Url === 'string' && patch.a1111Url.trim()) {
      this.config.a1111Url = patch.a1111Url.trim().replace(/\/$/, '');
    }
    if (typeof patch.ollamaUrl === 'string' && patch.ollamaUrl.trim()) {
      this.config.ollamaUrl = patch.ollamaUrl.trim().replace(/\/$/, '');
    }
    if (typeof patch.ollamaModel === 'string' && patch.ollamaModel.trim()) {
      this.config.ollamaModel = patch.ollamaModel.trim();
    }
    if (typeof patch.huggingfaceToken === 'string') {
      this.config.huggingfaceToken = patch.huggingfaceToken.trim();
    }
    if (typeof patch.openaiApiKey === 'string') {
      this.config.openaiApiKey = patch.openaiApiKey.trim();
    }
    if (typeof patch.geminiApiKey === 'string') {
      this.config.geminiApiKey = patch.geminiApiKey.trim();
    }
    if (typeof patch.falApiKey === 'string') {
      this.config.falApiKey = patch.falApiKey.trim();
    }
    return this.getPublicStatus();
  }

  async discoverComfyUIModels() {
    try {
      const [ckptRes, loraRes] = await Promise.all([
        fetch(`${this.config.comfyuiUrl}/object_info/CheckpointLoaderSimple`, {
          signal: AbortSignal.timeout(1500),
        }),
        fetch(`${this.config.comfyuiUrl}/object_info/LoraLoader`, {
          signal: AbortSignal.timeout(1500),
        }).catch(() => null),
      ]);
      if (!ckptRes.ok) return { reachable: false, checkpoints: [], loras: [] };
      const data = await ckptRes.json();
      const ckpts = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
      let loras = [];
      if (loraRes?.ok) {
        const lData = await loraRes.json();
        loras = lData?.LoraLoader?.input?.required?.lora_name?.[0] || [];
      }
      return {
        reachable: true,
        checkpoints: Array.isArray(ckpts) ? ckpts : [],
        loras: Array.isArray(loras) ? loras : [],
      };
    } catch {
      return { reachable: false, checkpoints: [], loras: [] };
    }
  }

  async discoverA1111() {
    try {
      const res = await fetch(`${this.config.a1111Url}/sdapi/v1/sd-models`, {
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return { reachable: false, models: [] };
      const list = await res.json();
      return {
        reachable: true,
        models: Array.isArray(list) ? list.map((m) => m.title || m.model_name) : [],
      };
    } catch {
      return { reachable: false, models: [] };
    }
  }

  async discoverOllama() {
    try {
      const res = await fetch(`${this.config.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return { reachable: false, models: [] };
      const data = await res.json();
      return {
        reachable: true,
        models: Array.isArray(data?.models) ? data.models.map((m) => m.name) : [],
      };
    } catch {
      return { reachable: false, models: [] };
    }
  }

  async craft(req) {
    const provider = req.provider || 'procedural';
    const workflow = req.workflow || 'text-to-image';
    const baseSeed =
      Number.isFinite(Number(req.seed)) && Number(req.seed) > 0
        ? Number(req.seed)
        : Math.floor(Math.random() * 1_000_000_000);

    if (workflow === 'prompt-enhance') {
      return this.enhancePrompt({ ...req, provider, seed: baseSeed });
    }

    const batchCount = Math.min(4, Math.max(1, Number(req.batchCount) || 1));
    if (batchCount > 1) {
      const results = await Promise.all(
        Array.from({ length: batchCount }, (_, i) =>
          this.dispatchSingle({ ...req, provider, seed: baseSeed + i * 101 }),
        ),
      );
      return {
        ...results[0],
        variations: results.map((r) => ({ seed: r.seed, imageUrl: r.imageUrl })).filter((v) => v.imageUrl),
        note: `${batchCount} farklı seed ile toplu varyasyon üretildi.`,
      };
    }

    return this.dispatchSingle({ ...req, provider, seed: baseSeed });
  }

  async dispatchSingle(req) {
    switch (req.provider) {
      case 'pollinations':
        return this.runPollinations(req);
      case 'comfyui':
        return this.runComfyUI(req);
      case 'a1111':
        return this.runA1111(req);
      case 'huggingface':
        return this.runHuggingFace(req);
      case 'openai':
        return this.runOpenAI(req);
      case 'gemini':
        return this.runGemini(req);
      case 'fal':
        return this.runFal(req);
      case 'procedural':
      default:
        return this.runProceduralPreview(req);
    }
  }

  async enhancePrompt(req) {
    const basePrompt = String(req.prompt || '').trim();
    if (!basePrompt) throw new Error('Prompt boş olamaz.');

    if (req.provider === 'ollama') {
      const res = await fetch(`${this.config.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.ollamaModel,
          stream: false,
          prompt: `Expand this creative scene prompt into a crisp, production-ready cinematic image generation prompt (max 65 words, comma-separated camera, lighting, material details). Input: "${basePrompt}"`,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Ollama erişim hatası (${res.status})`);
      const data = await res.json();
      return {
        id: `craft-${crypto.randomUUID().slice(0, 8)}`,
        workflow: 'prompt-enhance',
        provider: 'ollama',
        modelId: this.config.ollamaModel,
        prompt: basePrompt,
        enhancedPrompt: String(data.response || basePrompt).trim(),
        seed: req.seed,
        width: req.width || 1024,
        height: req.height || 1024,
        createdAt: new Date().toISOString(),
        note: 'Ollama local LLM ile genişletildi.',
      };
    }

    if (req.provider === 'pollinations') {
      try {
        const res = await fetch(
          `https://text.pollinations.ai/${encodeURIComponent(
            `Rewrite into a vivid 50-word cinematic visual generation prompt with lighting, lens, and texture details: ${basePrompt}`,
          )}`,
          { signal: AbortSignal.timeout(2500) },
        );
        if (res.ok) {
          const text = (await res.text()).trim();
          if (text && !text.toLowerCase().includes('error') && !text.toLowerCase().includes('payment')) {
            return {
              id: `craft-${crypto.randomUUID().slice(0, 8)}`,
              workflow: 'prompt-enhance',
              provider: 'pollinations',
              modelId: 'pollinations-prompt-director',
              prompt: basePrompt,
              enhancedPrompt: text,
              seed: req.seed,
              width: req.width || 1024,
              height: req.height || 1024,
              createdAt: new Date().toISOString(),
              note: 'Açık kaynak Prompt Director ile genişletildi.',
            };
          }
        }
      } catch {
        // fallback below
      }
    }

    if (req.provider === 'openai' && this.config.openaiApiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an art director. Expand user scene prompts into concise, visual, camera-and-lighting rich prompts under 65 words.',
            },
            { role: 'user', content: basePrompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI API hatası (${res.status})`);
      const data = await res.json();
      return {
        id: `craft-${crypto.randomUUID().slice(0, 8)}`,
        workflow: 'prompt-enhance',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        prompt: basePrompt,
        enhancedPrompt: data?.choices?.[0]?.message?.content?.trim() || basePrompt,
        seed: req.seed,
        width: req.width || 1024,
        height: req.height || 1024,
        createdAt: new Date().toISOString(),
      };
    }

    const enriched = `${basePrompt}, dramatic three-point cinematic lighting, volumetric atmosphere, physically based materials, 35mm anamorphic lens depth of field, sharp focal subject, high dynamic range`;
    return {
      id: `craft-${crypto.randomUUID().slice(0, 8)}`,
      workflow: 'prompt-enhance',
      provider: 'procedural',
      modelId: 'procedural-studio-preview',
      prompt: basePrompt,
      enhancedPrompt: enriched,
      seed: req.seed,
      width: req.width || 1024,
      height: req.height || 1024,
      createdAt: new Date().toISOString(),
      note: 'Çevrimdışı sahne yönetmeni şablonu ile zenginleştirildi.',
    };
  }

  async runPollinations(req) {
    const width = Math.min(1280, Math.max(512, Number(req.width) || 1024));
    const height = Math.min(1280, Math.max(512, Number(req.height) || 1024));
    const model = req.modelId === 'pollinations-turbo' ? 'turbo' : 'flux';
    const promptText = encodeURIComponent(req.prompt || 'Cinematic futuristic creative studio artwork');
    const url = `https://image.pollinations.ai/prompt/${promptText}?width=${width}&height=${height}&seed=${req.seed}&model=${model}&nologo=true`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const arrBuf = await res.arrayBuffer();
        if (contentType.startsWith('image/') && arrBuf.byteLength > 2000) {
          const dataUrl = `data:${contentType};base64,${Buffer.from(arrBuf).toString('base64')}`;
          return {
            id: `craft-${crypto.randomUUID().slice(0, 8)}`,
            workflow: req.workflow,
            provider: 'pollinations',
            modelId: req.modelId,
            prompt: req.prompt,
            seed: req.seed,
            width,
            height,
            imageUrl: dataUrl,
            createdAt: new Date().toISOString(),
            note: `Açık kaynak ${model.toUpperCase()} motoru ile canlı üretildi.`,
          };
        }
      }
    } catch {
      // External free endpoint unavailable or rate-limited; cascade automatically below
    }

    // Automatic fallback cascade: Local ComfyUI -> Local A1111 -> HuggingFace -> Built-in Alpemox Engine
    const comfy = await this.discoverComfyUIModels();
    if (comfy.reachable) {
      return this.runComfyUI({ ...req, provider: 'comfyui' });
    }
    const a1111 = await this.discoverA1111();
    if (a1111.reachable) {
      return this.runA1111({ ...req, provider: 'a1111' });
    }
    if (this.config.huggingfaceToken) {
      return this.runHuggingFace({ ...req, provider: 'huggingface' });
    }

    const localOut = await this.runProceduralPreview({ ...req, width, height });
    return {
      ...localOut,
      note: 'Harici ücretsiz Pollinations ucu şu an 402/limit verdiği için Alpemox yerleşik motoruyla üretildi. Gerçek difüzyon görseli için AI Ayarları’ndan yerel ComfyUI / A1111 veya HuggingFace / API anahtarı bağlayabilirsiniz.',
    };
  }

  async runHuggingFace(req) {
    if (!this.config.huggingfaceToken) {
      throw new Error('Hugging Face Token (HF_TOKEN) tanımlı değil. AI Ayarları penceresinden ekleyin.');
    }
    const res = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.huggingfaceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: req.prompt,
        parameters: {
          num_inference_steps: Math.min(8, Number(req.steps) || 4),
          width: Number(req.width) || 1024,
          height: Number(req.height) || 1024,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Hugging Face hatası (${res.status}): ${errText.slice(0, 180)}`);
    }
    const arrBuf = await res.arrayBuffer();
    return {
      id: `craft-${crypto.randomUUID().slice(0, 8)}`,
      workflow: req.workflow,
      provider: 'huggingface',
      modelId: 'hf-flux-schnell',
      prompt: req.prompt,
      seed: req.seed,
      width: Number(req.width) || 1024,
      height: Number(req.height) || 1024,
      imageUrl: `data:image/png;base64,${Buffer.from(arrBuf).toString('base64')}`,
      createdAt: new Date().toISOString(),
      note: 'Hugging Face FLUX.1-schnell ile üretildi.',
    };
  }

  async runA1111(req) {
    const info = await this.discoverA1111();
    if (!info.reachable) {
      throw new Error(`Automatic1111/Forge sunucusuna erişilemiyor (${this.config.a1111Url}).`);
    }
    const isImg2Img = (req.workflow === 'stage-to-image' || req.workflow === 'inpaint') && (req.stageRgbDataUrl || req.canvasDataUrl);
    const endpoint = isImg2Img ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img';
    const body = {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt || 'blurry, low quality',
      steps: Number(req.steps) || 24,
      cfg_scale: Number(req.cfgScale) || 7,
      seed: req.seed,
      width: Number(req.width) || 1024,
      height: Number(req.height) || 1024,
    };
    if (isImg2Img) {
      body.init_images = [req.stageRgbDataUrl || req.canvasDataUrl];
      body.denoising_strength = Number(req.denoise) || 0.72;
    }

    const res = await fetch(`${this.config.a1111Url}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`A1111 API hatası (${res.status})`);
    const data = await res.json();
    const imgB64 = data?.images?.[0];
    if (!imgB64) throw new Error('A1111 görsel döndürmedi.');
    return {
      id: `craft-${crypto.randomUUID().slice(0, 8)}`,
      workflow: req.workflow,
      provider: 'a1111',
      modelId: info.models[0] || 'a1111-sdxl',
      prompt: req.prompt,
      seed: req.seed,
      width: body.width,
      height: body.height,
      imageUrl: `data:image/png;base64,${imgB64}`,
      createdAt: new Date().toISOString(),
      note: 'Yerel Automatic1111 / Forge ile üretildi.',
    };
  }

  async uploadImageToComfyUI(dataUrl, filenamePrefix = 'alpemox') {
    const match = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(dataUrl || '');
    if (!match) return null;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: `image/${match[1]}` }), `${filenamePrefix}-${Date.now()}.${ext}`);
    const res = await fetch(`${this.config.comfyuiUrl}/upload/image`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(`ComfyUI image upload başarısız (${res.status})`);
    const data = await res.json();
    return data.name;
  }

  async runComfyUI(req) {
    const discovery = await this.discoverComfyUIModels();
    if (!discovery.reachable) {
      throw new Error(`ComfyUI sunucusuna erişilemiyor (${this.config.comfyuiUrl}). Yerel ComfyUI çalışıyor mu kontrol edin veya Pollinations / Procedural seçin.`);
    }
    const ckptName = discovery.checkpoints[0];
    if (!ckptName) {
      throw new Error('ComfyUI sunucusunda yüklü bir checkpoint bulunamadı.');
    }

    const width = Math.min(2048, Math.max(256, Number(req.width) || 1024));
    const height = Math.min(2048, Math.max(256, Number(req.height) || 1024));
    const steps = Math.min(60, Math.max(1, Number(req.steps) || 20));
    const cfg = Number(req.cfgScale) || 7;
    const denoise =
      req.workflow === 'stage-to-image' || req.workflow === 'inpaint'
        ? Math.min(1, Math.max(0.1, Number(req.denoise) || 0.72))
        : 1;

    let uploadedRefName = null;
    const refUrl = req.stageRgbDataUrl || req.canvasDataUrl;
    if ((req.workflow === 'stage-to-image' || req.workflow === 'inpaint') && refUrl) {
      uploadedRefName = await this.uploadImageToComfyUI(refUrl, 'stage-ref');
    }

    const useLora = Boolean(req.loraName && discovery.loras.includes(req.loraName));
    const promptGraph = {
      '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: ckptName } },
      '2': { class_type: 'CLIPTextEncode', inputs: { text: req.prompt || 'masterpiece', clip: useLora ? ['9', 1] : ['1', 1] } },
      '3': { class_type: 'CLIPTextEncode', inputs: { text: req.negativePrompt || 'blurry, low quality, artifacts', clip: useLora ? ['9', 1] : ['1', 1] } },
      '4': uploadedRefName
        ? { class_type: 'LoadImage', inputs: { image: uploadedRefName } }
        : { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
      '6': {
        class_type: 'KSampler',
        inputs: {
          seed: req.seed,
          steps,
          cfg,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise,
          model: useLora ? ['9', 0] : ['1', 0],
          positive: ['2', 0],
          negative: ['3', 0],
          latent_image: uploadedRefName ? ['5', 0] : ['4', 0],
        },
      },
      '7': { class_type: 'VAEDecode', inputs: { samples: ['6', 0], vae: ['1', 2] } },
      '8': { class_type: 'SaveImage', inputs: { filename_prefix: 'alpemox', images: ['7', 0] } },
    };
    if (uploadedRefName) {
      promptGraph['5'] = { class_type: 'VAEEncode', inputs: { pixels: ['4', 0], vae: ['1', 2] } };
    }
    if (useLora) {
      promptGraph['9'] = {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: req.loraName,
          strength_model: Number(req.loraStrength) || 0.75,
          strength_clip: Number(req.loraStrength) || 0.75,
          model: ['1', 0],
          clip: ['1', 1],
        },
      };
    }

    const queueRes = await fetch(`${this.config.comfyuiUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptGraph }),
    });
    if (!queueRes.ok) throw new Error(`ComfyUI /prompt hatası (${queueRes.status})`);
    const { prompt_id: promptId } = await queueRes.json();

    let outputImage = null;
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const histRes = await fetch(`${this.config.comfyuiUrl}/history/${promptId}`);
      if (!histRes.ok) continue;
      const hist = await histRes.json();
      const entry = hist[promptId];
      const imgInfo = entry?.outputs?.['8']?.images?.[0];
      if (imgInfo) {
        const viewUrl = `${this.config.comfyuiUrl}/view?filename=${encodeURIComponent(imgInfo.filename)}&subfolder=${encodeURIComponent(imgInfo.subfolder || '')}&type=${encodeURIComponent(imgInfo.type || 'output')}`;
        const imgFetch = await fetch(viewUrl);
        const arrBuf = await imgFetch.arrayBuffer();
        outputImage = `data:image/png;base64,${Buffer.from(arrBuf).toString('base64')}`;
        break;
      }
    }
    if (!outputImage) throw new Error('ComfyUI zaman aşımına uğradı.');

    return {
      id: `craft-${crypto.randomUUID().slice(0, 8)}`,
      workflow: req.workflow,
      provider: 'comfyui',
      modelId: ckptName,
      prompt: req.prompt,
      seed: req.seed,
      width,
      height,
      imageUrl: outputImage,
      createdAt: new Date().toISOString(),
      note: `ComfyUI (${ckptName}) ile üretildi.`,
    };
  }

  async runOpenAI(req) {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API anahtarı tanımlı değil. AI Ayarları üzerinden ekleyin.');
    }
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({ model: 'gpt-image-1', prompt: req.prompt, size: '1024x1024' }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Image hatası (${res.status}): ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    const url = data?.data?.[0]?.url;
    return {
      id: `craft-${crypto.randomUUID().slice(0, 8)}`,
      workflow: req.workflow,
      provider: 'openai',
      modelId: 'openai-gpt-image-1',
      prompt: req.prompt,
      seed: req.seed,
      width: 1024,
      height: 1024,
      imageUrl: b64 ? `data:image/png;base64,${b64}` : url,
      createdAt: new Date().toISOString(),
    };
  }

  async runGemini(req) {
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API anahtarı tanımlı değil. AI Ayarları üzerinden ekleyin.');
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(this.config.geminiApiKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt: req.prompt }], parameters: { sampleCount: 1 } }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini Imagen hatası (${res.status}): ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('Gemini Imagen görsel verisi döndürmedi.');
    return {
      id: `craft-${crypto.randomUUID().slice(0, 8)}`,
      workflow: req.workflow,
      provider: 'gemini',
      modelId: 'gemini-imagen-3',
      prompt: req.prompt,
      seed: req.seed,
      width: 1024,
      height: 1024,
      imageUrl: `data:image/png;base64,${b64}`,
      createdAt: new Date().toISOString(),
    };
  }

  async runFal(req) {
    if (!this.config.falApiKey) {
      throw new Error('Fal.ai API anahtarı tanımlı değil. AI Ayarları üzerinden ekleyin.');
    }
    const modelPath =
      req.workflow === 'image-to-video'
        ? 'fal-ai/kling-video/v1.6/standard/image-to-video'
        : req.workflow === 'image-to-3d'
          ? 'fal-ai/triposr'
          : 'fal-ai/flux-pro/v1.1';

    const body =
      req.workflow === 'image-to-video'
        ? { prompt: req.prompt, image_url: req.stageRgbDataUrl || req.canvasDataUrl }
        : req.workflow === 'image-to-3d'
          ? { image_url: req.stageRgbDataUrl || req.canvasDataUrl }
          : {
              prompt: req.prompt,
              seed: req.seed,
              image_size: { width: req.width || 1024, height: req.height || 1024 },
            };

    const res = await fetch(`https://fal.run/${modelPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${this.config.falApiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fal.ai hatası (${res.status}): ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      id: `craft-${crypto.randomUUID().slice(0, 8)}`,
      workflow: req.workflow,
      provider: 'fal',
      modelId: req.modelId,
      prompt: req.prompt,
      seed: req.seed,
      width: req.width || 1024,
      height: req.height || 1024,
      imageUrl: data?.images?.[0]?.url,
      videoUrl: data?.video?.url,
      meshUrl: data?.model_mesh?.url,
      createdAt: new Date().toISOString(),
    };
  }

  async runProceduralPreview(req) {
    const width = Math.min(1536, Math.max(512, Number(req.width) || 1024));
    const height = Math.min(1536, Math.max(512, Number(req.height) || 1024));
    const hueA = req.seed % 360;
    const hueB = (hueA + 48) % 360;
    const hueC = (hueA + 195) % 360;
    const safePrompt = String(req.prompt || 'Alpemox Scene').replace(/[<>&"]/g, ' ').slice(0, 96);
    const hasStage = Boolean(req.stageRgbDataUrl);
    const hasDepth = Boolean(req.stageDepthDataUrl);
    const hasMask = Boolean(req.maskDataUrl);

    const stageImageTag = hasStage
      ? `<image href="${req.stageRgbDataUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity="0.62" />`
      : '';
    const depthBadge = hasDepth ? 'DEPTH-GUIDED' : 'PROMPT-ONLY';
    const maskBadge = hasMask ? ' + INPAINT-MASK' : '';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hueA}, 52%, 14%)"/>
          <stop offset="55%" stop-color="hsl(${hueB}, 64%, 22%)"/>
          <stop offset="100%" stop-color="hsl(${hueC}, 58%, 11%)"/>
        </linearGradient>
        <radialGradient id="glow" cx="52%" cy="42%" r="48%">
          <stop offset="0%" stop-color="hsla(${hueB}, 95%, 68%, 0.55)"/>
          <stop offset="100%" stop-color="hsla(${hueB}, 95%, 50%, 0)"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      ${stageImageTag}
      <rect width="100%" height="100%" fill="url(#glow)" style="mix-blend-mode:screen"/>
      <g opacity="0.22" stroke="hsl(${hueC}, 80%, 72%)" stroke-width="1.5" fill="none">
        <circle cx="${width * 0.5}" cy="${height * 0.45}" r="${Math.min(width, height) * 0.24}"/>
        <circle cx="${width * 0.5}" cy="${height * 0.45}" r="${Math.min(width, height) * 0.34}" stroke-dasharray="10 8"/>
        <line x1="${width * 0.12}" y1="${height * 0.78}" x2="${width * 0.88}" y2="${height * 0.78}"/>
      </g>
      <rect x="28" y="${height - 134}" width="${width - 56}" height="106" rx="14" fill="rgba(9,12,20,0.78)" stroke="rgba(255,255,255,0.16)"/>
      <text x="50" y="${height - 96}" fill="#38bdf8" font-family="ui-monospace, monospace" font-size="18" font-weight="700">ALPEMOX OFFLINE PREVIEW · ${req.workflow.toUpperCase()} · ${depthBadge}${maskBadge}</text>
      <text x="50" y="${height - 64}" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="22" font-weight="600">${safePrompt}</text>
      <text x="50" y="${height - 38}" fill="#94a3b8" font-family="ui-monospace, monospace" font-size="15">SEED ${req.seed} · ${width}×${height} · Canlı Flux / ComfyUI / A1111 ile gerçek AI render üretilebilir</text>
    </svg>`;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
    return {
      id: `craft-${crypto.randomUUID().slice(0, 8)}`,
      workflow: req.workflow,
      provider: 'procedural',
      modelId: 'procedural-studio-preview',
      prompt: req.prompt,
      seed: req.seed,
      width,
      height,
      imageUrl: dataUrl,
      createdAt: new Date().toISOString(),
      note: 'Çevrimdışı stüdyo kompozit önizlemesi üretildi.',
    };
  }
}
