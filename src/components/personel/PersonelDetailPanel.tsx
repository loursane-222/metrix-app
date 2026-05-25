"use client"

import { useState } from "react"
import { PersonelRoleBadge } from "./PersonelRoleBadge"
import type { Personel } from "./types"

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function oran(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function tl(v: number) {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₺"
}

function performansTone(not: number | null) {
  if (not === null) return "border-slate-700 bg-slate-800/40 text-slate-300"
  if (not >= 80) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (not >= 60) return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  return "border-red-500/30 bg-red-500/10 text-red-300"
}

function performansEtiket(not: number | null) {
  if (not === null) return "Veri Yok"
  if (not >= 80) return "Yüksek Performans"
  if (not >= 60) return "Gelişebilir"
  return "Riskli"
}

// ─── Alt componentler (sadece bu dosyada kullanılır) ─────────────────────────

function Kpi({ label, value, tone = "text-white" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-semibold leading-tight tabular-nums md:text-xl ${tone}`}>
        {value}
      </p>
    </div>
  )
}

function Bar({ label, value }: { label: string; value: number }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)))
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">%{safe}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${safe}%` }} />
      </div>
    </div>
  )
}

function SmallRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0B1120] px-4 py-3">
      <p className="min-w-0 truncate text-xs text-slate-400">{label}</p>
      <p className="shrink-0 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function InfoRow({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="rounded-2xl bg-[#0B1120] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      {href ? (
        <a
          href={href}
          className="mt-2 block truncate font-semibold text-blue-400 transition hover:text-blue-300"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 truncate font-semibold">{value}</p>
      )}
    </div>
  )
}

// ─── Ana component ────────────────────────────────────────────────────────────

export function PersonelDetailPanel({
  aktif,
  onEdit,
  onStatusChange,
  onBack,
  personelKayitToplamMaliyet,
}: {
  aktif: Personel
  onEdit: () => void
  onStatusChange: (id: string, newAktif: boolean) => Promise<void>
  onBack: () => void
  personelKayitToplamMaliyet?: number
}) {
  const [changingStatus, setChangingStatus] = useState(false)

  const tamamlamaOran = oran(aktif.tamamlananGorev || 0, aktif.toplamGorev || 0)
  const zamanindaOran = oran(aktif.zamanindaTamamlanan || 0, aktif.tamamlananGorev || 0)
  const acikGorev = Math.max(0, (aktif.toplamGorev || 0) - (aktif.tamamlananGorev || 0))

  const brutMaas = Number(aktif.brutMaas || 0)
  const sgkOrani = Number(aktif.sgkOrani ?? 20.5)
  const isverenSgk = brutMaas > 0 ? Math.round(brutMaas * (sgkOrani / 100)) : 0
  const toplamMaliyet = brutMaas + isverenSgk

  const maasPayi = (personelKayitToplamMaliyet ?? 0) > 0 && toplamMaliyet > 0
    ? Math.round((toplamMaliyet / personelKayitToplamMaliyet!) * 100)
    : null
  const gunlukCalismaGun = Number(aktif.gunlukCalismaGun ?? 5)
  const kapasiteOrani = (aktif.toplamGorev || 0) > 0
    ? Math.round(((aktif.toplamGorev || 0) / Math.max(gunlukCalismaGun * 22, 1)) * 100)
    : null

  async function handleToggle() {
    setChangingStatus(true)
    try {
      await onStatusChange(aktif.id, !aktif.aktif)
    } finally {
      setChangingStatus(false)
    }
  }

  return (
    <div className="flex h-full flex-col">

      {/* Mobil: geri + düzenle satırı */}
      <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
        <button
          onClick={onBack}
          className="rounded-xl border border-slate-700 bg-[#111827] px-4 py-3 text-sm font-semibold"
        >
          ← Personel
        </button>
        <button
          onClick={onEdit}
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold"
        >
          Düzenle
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-slate-500 uppercase">Seçili Personel</p>
          <h2 className="mt-2 break-words text-2xl font-semibold leading-tight md:text-3xl">
            {aktif.ad} {aktif.soyad}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-400">{aktif.gorevi}</p>
            {aktif.calismaYili > 0 && (
              <>
                <span className="text-slate-700">·</span>
                <p className="text-sm text-slate-400">{aktif.calismaYili} yıl kıdem</p>
              </>
            )}
            {aktif.rolGrubu && (
              <PersonelRoleBadge rolGrubu={aktif.rolGrubu} size="md" />
            )}
          </div>
        </div>
        <span
          className={[
            "shrink-0 self-start rounded-full border px-4 py-2 text-sm font-semibold",
            performansTone(aktif.performansNotu),
          ].join(" ")}
        >
          {performansEtiket(aktif.performansNotu)}
        </span>
      </div>

      {/* KPI */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Performans"
          value={aktif.performansNotu === null ? "—" : `%${aktif.performansNotu}`}
          tone="text-emerald-300"
        />
        <Kpi label="Tamamlama" value={`%${tamamlamaOran}`} tone="text-blue-300" />
        <Kpi label="Zamanında" value={`%${zamanindaOran}`} tone="text-violet-300" />
        <Kpi label="Toplam Görev" value={aktif.toplamGorev || 0} />
      </div>

      {/* Maliyet */}
      <div className="mt-4 rounded-3xl border border-slate-800 bg-[#111827] p-5">
        <p className="text-sm text-slate-400">Maliyet Yükü</p>

        {brutMaas > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#0B1120] p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Brüt Maaş</p>
              <p className="mt-1 font-semibold text-white">{tl(brutMaas)}</p>
              <p className="text-[10px] text-slate-600">aylık</p>
            </div>
            <div className="rounded-2xl bg-[#0B1120] p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">İşveren SGK</p>
              <p className="mt-1 font-semibold text-amber-300">{tl(isverenSgk)}</p>
              <p className="text-[10px] text-slate-600">%{sgkOrani.toFixed(1)}</p>
            </div>
            <div className="col-span-2 rounded-2xl bg-[#0B1120] p-3 md:col-span-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Toplam Aylık</p>
              <p className="mt-1 font-bold text-red-300">{tl(toplamMaliyet)}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400">
              Maaş bilgisi girilmemiş
            </span>
            <button
              onClick={onEdit}
              className="text-xs text-blue-400 underline underline-offset-2 transition hover:text-blue-300"
            >
              Ekle →
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {maasPayi !== null ? (
            <span className="rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-[10px] text-slate-300">
              Maaş payı · %{maasPayi}
            </span>
          ) : (
            <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[10px] text-slate-600">
              Maaş payı · Veri yok
            </span>
          )}
          {kapasiteOrani !== null ? (
            <span className="rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-[10px] text-slate-300">
              Görev yoğunluğu · %{kapasiteOrani}
            </span>
          ) : (
            <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[10px] text-slate-600">
              Görev yoğunluğu · Veri yok
            </span>
          )}
          <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[10px] text-slate-600">
            Mtül/gün verimi · Veri bekliyor
          </span>
        </div>
      </div>

      {/* Performans + İletişim + Durum */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.82fr]">
        <section className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
          <p className="text-sm text-slate-400">Performans Paneli</p>
          <div className="mt-5 space-y-5">
            <Bar label="Tamamlama Oranı" value={tamamlamaOran} />
            <Bar label="Zamanında Tamamlama" value={zamanindaOran} />
            <Bar label="Genel Performans" value={aktif.performansNotu || 0} />
          </div>
          <div className="mt-6 grid gap-2">
            <SmallRow label="Tamamlanan" value={aktif.tamamlananGorev || 0} />
            <SmallRow label="Zamanında" value={aktif.zamanindaTamamlanan || 0} />
            <SmallRow label="Açık Görev" value={acikGorev} />
          </div>
        </section>

        <div className="space-y-3">
          {/* İletişim */}
          <section className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
            <p className="mb-3 text-sm text-slate-400">Bağlılık & İletişim</p>
            <div className="space-y-3">
              <InfoRow
                label="Telefon"
                value={aktif.telefon || "—"}
                href={aktif.telefon ? `tel:${aktif.telefon}` : undefined}
              />
              <InfoRow
                label="E-posta"
                value={aktif.email || "—"}
                href={aktif.email ? `mailto:${aktif.email}` : undefined}
              />
              <InfoRow
                label="Bağlı Olduğu"
                value={
                  aktif.bagliOldugu
                    ? `${aktif.bagliOldugu.ad} ${aktif.bagliOldugu.soyad}`
                    : "Bağımsız"
                }
              />
            </div>
          </section>

          {/* Aktif/Pasif toggle */}
          <section className="rounded-3xl border border-slate-800 bg-[#111827] p-5">
            <p className="mb-3 text-sm text-slate-400">Personel Durumu</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">
                  {aktif.aktif ? "Aktif" : "Pasif"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {aktif.aktif
                    ? "Görev alabilir, takvimde görünür"
                    : "Görev listesinde görünmez"}
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={changingStatus}
                className={[
                  "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
                  aktif.aktif
                    ? "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                ].join(" ")}
              >
                {changingStatus
                  ? "İşleniyor..."
                  : aktif.aktif
                  ? "Pasifleştir"
                  : "Aktifleştir"}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Operasyon yorumu */}
      <section className="mt-4 flex-1 rounded-3xl border border-slate-800 bg-[#111827] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Operasyon Yorumu</p>
          <p className="text-xs text-slate-500">Görev verisine göre</p>
        </div>
        <p className="mt-4 text-lg font-semibold leading-relaxed">
          {aktif.performansNotu === null
            ? "Henüz yeterli görev verisi yok. Performans için birkaç atama sonrası değerlendirme yapılmalı."
            : aktif.performansNotu >= 80
            ? "Bu personel güvenilir ve yüksek performanslı. Kritik görevlere atanabilir."
            : aktif.performansNotu >= 60
            ? "Performans kabul edilebilir. Gecikme ve görev hacmi takip edilmeli."
            : "Riskli performans. Görev atamaları ve sorumluluk seviyesi yeniden değerlendirilmeli."}
        </p>
      </section>
    </div>
  )
}
