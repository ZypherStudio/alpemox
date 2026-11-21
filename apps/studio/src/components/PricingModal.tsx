import { useEffect, useState } from 'react';
import { X, Cloud, Check, Mail, Sparkles } from 'lucide-react';
import { PRICING_PLANS } from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';

export function PricingModal() {
  const pricingOpen = useStudioStore((s) => s.pricingOpen);
  const setPricingOpen = useStudioStore((s) => s.setPricingOpen);
  const setActivePage = useStudioStore((s) => s.setActivePage);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('İçerik Üreticisi / Tasarımcı');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pricingOpen) return;
    fetch('/api/cloud/waitlist')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.count === 'number') setWaitlistCount(d.count);
      })
      .catch(() => {});
  }, [pricingOpen]);

  if (!pricingOpen) return null;

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/cloud/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kayıt başarısız.');
      } else {
        setWaitlistCount(data.count);
        setStatusMsg(
          data.alreadyJoined
            ? 'Bu e-posta zaten Alpemox Cloud erken erişim listesinde!'
            : 'Harika! Alpemox Cloud açıldığında ilk davet edilenlerden olacaksınız.',
        );
        setEmail('');
      }
    } catch {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-[#0f121a] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Cloud className="h-5 w-5 text-[#4e7bfb]" />
            <div>
              <h2 className="font-display text-base font-extrabold text-white">
                Alpemox Open Suite & Alpemox Cloud (Yakında)
              </h2>
              <p className="text-[11px] text-slate-400">
                Tüm yerel araçlar AGPL-3.0 ile %100 ücretsiz; yönetilen bulut GPU & 4K render çok yakında Cloud’da.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPricingOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PRICING_PLANS.map((plan) => {
            const isCloud = plan.id === 'pro';
            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-xl border p-4 ${
                  isCloud
                    ? 'border-[#4e7bfb]/50 bg-gradient-to-b from-[#4e7bfb]/15 to-[#111521]'
                    : 'border-slate-800 bg-[#111521]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-white">{plan.name}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        isCloud ? 'bg-[#4e7bfb]/25 text-sky-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {isCloud ? 'Yakında' : 'Şimdi Aktif'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-black text-white">{plan.price}</span>
                    <span className="text-[11px] text-slate-400">{plan.period}</span>
                  </div>
                  {'altPrice' in plan && plan.altPrice && (
                    <div className="text-[10px] font-medium text-sky-300">{plan.altPrice}</div>
                  )}
                  <p className="mt-2 text-xs text-slate-400">{plan.description}</p>

                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[11px] text-slate-200">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {!isCloud && (
                  <button
                    onClick={() => {
                      setPricingOpen(false);
                      setActivePage('studio', 'hybrid');
                    }}
                    className="mt-4 w-full rounded-lg bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                  >
                    Tüm Araçları Ücretsiz Kullan
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Cloud Waitlist Form */}
        <form
          onSubmit={handleJoinWaitlist}
          className="mt-5 rounded-xl border border-[#4e7bfb]/35 bg-[#0b0d13] p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Mail className="h-3.5 w-3.5 text-[#4e7bfb]" />
              Alpemox Cloud Erken Erişim Bekleme Listesi
            </div>
            <span className="font-mono-hud text-[10px] text-slate-400">
              {waitlistCount} kişi listede
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              placeholder="ornek@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-[#4e7bfb] focus:outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option>İçerik Üreticisi / Tasarımcı</option>
              <option>Video Editörü / Yönetmen</option>
              <option>3D Sanatçı / Oyun Geliştirici</option>
              <option>Ajans / Takım</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center justify-center gap-1 rounded-lg bg-[#4e7bfb] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#3b69ea] disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {busy ? 'Kaydediliyor...' : 'Listeye Katıl'}
            </button>
          </div>
          {error && <p className="mt-2 text-[11px] text-rose-400">{error}</p>}
          {statusMsg && <p className="mt-2 text-[11px] text-emerald-400">{statusMsg}</p>}
        </form>
      </div>
    </div>
  );
}
