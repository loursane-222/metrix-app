"use client"

import { useEffect, useMemo, useState } from "react"
import { PersonelListCard } from "@/components/personel/PersonelListCard"
import { PersonelDetailPanel } from "@/components/personel/PersonelDetailPanel"
import { PersonelFormModal } from "@/components/personel/PersonelFormModal"
import type { Personel, PersonelYetki } from "@/components/personel/types"
import { GOREVLER } from "@/components/personel/types"

// ─── Yetki sabitleri ──────────────────────────────────────────────────────────

const BOS_YETKI: PersonelYetki = {
  isProgramiGorebilir: true,
  isProgramiDuzenleyebilir: false,
  imalatTamamlayabilir: false,
  maliyetGorebilir: false,
  musteriGorebilir: false,
  teklifOlusturabilir: false,
  atolyeAyarGorebilir: false,
}

// ─── Sade yardımcılar (yetki aside'da kullanılır) ────────────────────────────

function Mini({ label, value, tone = "text-white" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-[#111827] p-3 text-left"
    >
      <span className="min-w-0 pr-3 text-sm text-slate-300">{label}</span>
      <span
        className={[
          "h-6 w-11 shrink-0 rounded-full p-1 transition",
          value ? "bg-emerald-600" : "bg-slate-700",
        ].join(" ")}
      >
        <span
          className={[
            "block h-4 w-4 rounded-full bg-white transition",
            value ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </span>
    </button>
  )
}

// ─── Sayfa ────────────────────────────────────────────────────────────────────

export default function PersonelSayfasi() {
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [aktif, setAktif] = useState<Personel | null>(null)
  const [arama, setArama] = useState("")
  const [rol, setRol] = useState("Tümü")
  const [showForm, setShowForm] = useState(false)
  const [editingPersonel, setEditingPersonel] = useState<Personel | null>(null)
  const [yetki, setYetki] = useState<PersonelYetki>(BOS_YETKI)
  const [yetkiKaydediliyor, setYetkiKaydediliyor] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "detail">("list")
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  useEffect(() => { yukle() }, [])
  useEffect(() => { if (aktif?.id) yetkiYukle(aktif.id) }, [aktif?.id])

  async function yukle(secilecekId?: string) {
    const res = await fetch("/api/personel", { credentials: "include", cache: "no-store" })
    if (res.status === 401) { window.location.href = "/login"; return }
    const json = await res.json()
    const liste: Personel[] = Array.isArray(json.personeller) ? json.personeller : []
    setPersoneller(liste)
    if (secilecekId) {
      setAktif(liste.find((p) => p.id === secilecekId) || liste[0] || null)
    } else {
      setAktif((prev) =>
        prev ? liste.find((p) => p.id === prev.id) || liste[0] || null : liste[0] || null
      )
    }
  }

  async function yetkiYukle(personelId: string) {
    const res = await fetch(`/api/personel-yetki?personelId=${personelId}`, { cache: "no-store" })
    const json = await res.json()
    setYetki(json.yetki || { ...BOS_YETKI, personelId })
  }

  async function yetkiKaydet() {
    if (!aktif) return
    setYetkiKaydediliyor(true)
    try {
      const res = await fetch("/api/personel-yetki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...yetki, personelId: aktif.id }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.hata || "Yetki kaydedilemedi."); return }
      setYetki(json.yetki || yetki)
    } finally {
      setYetkiKaydediliyor(false)
    }
  }

  async function personelSil(id: string) {
    if (!confirm("Bu personeli silmek istediğinize emin misiniz?")) return
    await fetch(`/api/personel?id=${id}`, { method: "DELETE" })
    setPersoneller((prev) => prev.filter((x) => x.id !== id))
    if (aktif?.id === id) { setAktif(null); setMobileView("list") }
  }

  async function handleStatusChange(id: string, newAktif: boolean) {
    const p = personeller.find((x) => x.id === id)
    if (!p) return
    await fetch("/api/personel", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        ad: p.ad, soyad: p.soyad, gorevi: p.gorevi,
        calismaYili: p.calismaYili, telefon: p.telefon,
        email: p.email, aktif: newAktif,
      }),
    })
    await yukle()
    if (!newAktif) setMobileView("list")
  }

  function acForm(p?: Personel) {
    setEditingPersonel(p || null)
    setShowForm(true)
  }

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR")
    return personeller.filter((p) => {
      const rolOk = rol === "Tümü" || p.gorevi === rol
      const qOk =
        !q ||
        [p.ad, p.soyad, p.gorevi, p.telefon, p.email]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(q)
      return rolOk && qOk
    })
  }, [personeller, arama, rol])

  const ozet = useMemo(() => {
    const aktifSayi = personeller.filter((p) => p.aktif).length
    const toplamGorev = personeller.reduce((a, p) => a + (p.toplamGorev || 0), 0)
    const tamamlanan = personeller.reduce((a, p) => a + (p.tamamlananGorev || 0), 0)
    const skorlar = personeller.map((p) => p.performansNotu).filter((x): x is number => x !== null)
    const ortalama = skorlar.length
      ? Math.round(skorlar.reduce((a, b) => a + b, 0) / skorlar.length)
      : 0
    return { aktifSayi, toplamGorev, tamamlanan, ortalama }
  }, [personeller])

  const ayinElemani = useMemo(() => {
    if (!personeller.length) return null
    return [...personeller]
      .map((p) => {
        const tamam = p.tamamlananGorev || 0
        const toplam = p.toplamGorev || 0
        const zamaninda = p.zamanindaTamamlanan || 0
        const score =
          (toplam ? tamam / toplam : 0) * 0.4 +
          (tamam ? zamaninda / tamam : 0) * 0.3 +
          ((p.performansNotu || 0) / 100) * 0.2 +
          Math.min(1, toplam / 20) * 0.1
        return { ...p, score }
      })
      .sort((a, b) => b.score - a.score)[0]
  }, [personeller])

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#030712] p-2 text-white md:h-screen md:overflow-hidden md:p-3">
      <div className="grid min-h-[100dvh] grid-cols-1 gap-3 md:h-full md:min-h-0 md:grid-cols-[310px_minmax(0,1fr)_310px]">

        {/* ── SOL: LİSTE ──────────────────────────────────────────────── */}
        <aside
          className={[
            "flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] p-4 pt-[104px] md:pt-4",
            mobileView === "list" ? "flex" : "hidden md:flex",
          ].join(" ")}
        >
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Ekip Radarı</p>
          <h1 className="mt-2 text-2xl font-semibold">Personel</h1>

          {/* Mobil: hızlı ekle butonu */}
          <button
            onClick={() => acForm()}
            className="absolute right-4 top-6 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg md:hidden"
          >
            + Personel
          </button>

          {/* Özet */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Mini label="Aktif" value={ozet.aktifSayi} />
            <Mini label="Skor" value={`%${ozet.ortalama}`} tone="text-emerald-300" />
            <Mini label="Görev" value={ozet.toplamGorev} tone="text-blue-300" />
            <Mini label="Tamam" value={ozet.tamamlanan} tone="text-violet-300" />
          </div>

          {/* Arama */}
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ara..."
            className="mt-4 h-11 rounded-xl border border-slate-700 bg-[#111827] px-4 text-sm outline-none focus:border-blue-500"
          />

          {/* Rol filtresi */}
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="mt-2 h-11 rounded-xl border border-slate-700 bg-[#111827] px-4 text-sm outline-none focus:border-blue-500"
          >
            <option>Tümü</option>
            {GOREVLER.map((g) => <option key={g}>{g}</option>)}
          </select>

          {/* Liste */}
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
            {filtreli.map((p) => (
              <PersonelListCard
                key={p.id}
                personel={p}
                isActive={aktif?.id === p.id}
                onClick={() => { setAktif(p); setMobileView("detail") }}
                onDelete={() => personelSil(p.id)}
              />
            ))}
          </div>
        </aside>

        {/* ── ORTA: DETAY ─────────────────────────────────────────────── */}
        <main
          className={[
            "rounded-3xl border border-slate-800 bg-[#0B1120] px-4 pb-28 pt-[104px] md:overflow-y-auto md:p-5",
            mobileView === "detail" ? "block overflow-y-auto" : "hidden md:block",
          ].join(" ")}
        >
          {!aktif ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              Personel seçilmedi.
            </div>
          ) : (
            <PersonelDetailPanel
              aktif={aktif}
              onEdit={() => acForm(aktif)}
              onStatusChange={handleStatusChange}
              onBack={() => setMobileView("list")}
            />
          )}

          {/* Mobile bottom action bar */}
          <div className="fixed bottom-0 left-0 right-0 z-[85] border-t border-slate-800 bg-[#030712]/95 backdrop-blur md:hidden">
            <div className="flex gap-2 p-3" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
              <button
                onClick={() => acForm()}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
              >
                + Personel Ekle
              </button>
              {aktif && (
                <>
                  <button
                    onClick={() => acForm(aktif)}
                    className="flex-1 rounded-xl bg-slate-700 py-3 text-sm font-bold text-white"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={yetkiKaydet}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
                  >
                    Yetki Kaydet
                  </button>
                </>
              )}
            </div>
          </div>
        </main>

        {/* ── SAĞ: YETKİ & AKSIYON ────────────────────────────────────── */}
        <aside
          className={[
            "fixed right-0 top-0 z-[180] h-[100dvh] w-[86vw] max-w-[380px] flex-col overflow-y-auto rounded-l-3xl border-l border-slate-800 bg-[#0B1120] p-4 shadow-2xl transition-transform duration-300",
            "md:static md:max-w-none md:translate-x-0 md:rounded-3xl md:border md:flex md:flex-col md:overflow-hidden",
            mobilePanelOpen ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <button
            onClick={() => setMobilePanelOpen(false)}
            className="mb-4 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold md:hidden"
          >
            Kapat
          </button>

          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Kontrol Paneli</p>
          <h2 className="mt-2 text-xl font-semibold">Yetki & Aksiyon</h2>

          {ayinElemani && (
            <div className="mt-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-300">Ayın Elemanı</p>
              <p className="mt-2 text-lg font-semibold">
                {ayinElemani.ad} {ayinElemani.soyad}
              </p>
              <p className="text-xs text-slate-400">
                {ayinElemani.gorevi} · %{ayinElemani.performansNotu || 0}
              </p>
            </div>
          )}

          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Toggle label="İş programı görebilir" value={yetki.isProgramiGorebilir} onChange={(v) => setYetki({ ...yetki, isProgramiGorebilir: v })} />
              <Toggle label="İş programı düzenleyebilir" value={yetki.isProgramiDuzenleyebilir} onChange={(v) => setYetki({ ...yetki, isProgramiDuzenleyebilir: v })} />
              <Toggle label="İmalat tamamlayabilir" value={yetki.imalatTamamlayabilir} onChange={(v) => setYetki({ ...yetki, imalatTamamlayabilir: v })} />
              <Toggle label="Maliyet görebilir" value={yetki.maliyetGorebilir} onChange={(v) => setYetki({ ...yetki, maliyetGorebilir: v })} />
              <Toggle label="Müşteri görebilir" value={yetki.musteriGorebilir} onChange={(v) => setYetki({ ...yetki, musteriGorebilir: v })} />
              <Toggle label="Teklif oluşturabilir" value={yetki.teklifOlusturabilir} onChange={(v) => setYetki({ ...yetki, teklifOlusturabilir: v })} />
              <Toggle label="Atölye ayarı görebilir" value={yetki.atolyeAyarGorebilir} onChange={(v) => setYetki({ ...yetki, atolyeAyarGorebilir: v })} />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button
              onClick={yetkiKaydet}
              disabled={yetkiKaydediliyor || !aktif}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold transition hover:bg-emerald-500 disabled:bg-slate-700"
            >
              {yetkiKaydediliyor ? "Kaydediliyor..." : "Yetkileri Kaydet"}
            </button>
            <button
              onClick={() => aktif && acForm(aktif)}
              disabled={!aktif}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:bg-slate-700"
            >
              Personeli Düzenle
            </button>
            <button
              onClick={() => acForm()}
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold transition hover:bg-violet-500"
            >
              + Personel Ekle
            </button>
          </div>
        </aside>
      </div>

      {/* Mobil panel backdrop */}
      {mobilePanelOpen && (
        <div
          className="fixed inset-0 z-[170] bg-black/60 md:hidden"
          onClick={() => setMobilePanelOpen(false)}
        />
      )}

      {/* Form modal */}
      <PersonelFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        editingPersonel={editingPersonel}
        personeller={personeller}
        onSaved={(id) => yukle(id)}
      />
    </div>
  )
}
