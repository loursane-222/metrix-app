"use client";

type OnboardingWelcomeModalProps = {
  open: boolean;
  onStart: () => void;
  onClose: () => void;
};

export default function OnboardingWelcomeModal({
  open,
  onStart,
  onClose,
}: OnboardingWelcomeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-5 text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.28)] md:p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white shadow-lg">
          🎓
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600">
          Metrix Rehberi
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
          Metrix'i 7 adımda satış yapan operasyon sistemine çevirelim.
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
          Teklif, üretim, ekip ve tahsilatı tek akışta yöneten sistemi birlikte kuralım.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-blue-600"
          >
            Başla
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
          >
            Şimdilik kapat
          </button>
        </div>
      </div>
    </div>
  );
}
