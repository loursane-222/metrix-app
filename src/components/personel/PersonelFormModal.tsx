"use client"

import { useEffect, useState } from "react"
import { GOREVLER, ROL_OPTIONS } from "./types"
import type { Personel } from "./types"

interface FormState {
  ad: string
  soyad: string
  gorevi: string
  rolGrubu: string
  bagliOlduguId: string
  calismaYili: string
  telefon: string
  email: string
  password: string
  brutMaas: string
  sgkOrani: string
  iseBaslamaTarihi: string
  gunlukCalismaGun: string
}

const BOS_FORM: FormState = {
  ad: "",
  soyad: "",
  gorevi: GOREVLER[0],
  rolGrubu: "DIGER",
  bagliOlduguId: "",
  calismaYili: "",
  telefon: "",
  email: "",
  password: "",
  brutMaas: "",
  sgkOrani: "20.5",
  iseBaslamaTarihi: "",
  gunlukCalismaGun: "5",
}

const iCls =
  "h-10 w-full rounded-xl border border-slate-700 bg-[#111827] px-3 text-sm text-white outline-none focus:border-blue-500 appearance-none"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function PersonelFormModal({
  open,
  onClose,
  editingPersonel,
  personeller,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  editingPersonel?: Personel | null
  personeller: Personel[]
  onSaved: (personelId?: string) => void
}) {
  const [form, setForm] = useState<FormState>(BOS_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editingPersonel) {
      setForm({
        ad: editingPersonel.ad || "",
        soyad: editingPersonel.soyad || "",
        gorevi: editingPersonel.gorevi || GOREVLER[0],
        rolGrubu: editingPersonel.rolGrubu || "DIGER",
        bagliOlduguId: editingPersonel.bagliOldugu?.id || "",
        calismaYili: String(editingPersonel.calismaYili ?? ""),
        telefon: editingPersonel.telefon || "",
        email: editingPersonel.email || "",
        password: "",
        brutMaas: editingPersonel.brutMaas ? String(editingPersonel.brutMaas) : "",
        sgkOrani: String(editingPersonel.sgkOrani ?? 20.5),
        iseBaslamaTarihi: editingPersonel.iseBaslamaTarihi
          ? String(editingPersonel.iseBaslamaTarihi).slice(0, 10)
          : "",
        gunlukCalismaGun: String(editingPersonel.gunlukCalismaGun ?? 5),
      })
    } else {
      setForm(BOS_FORM)
    }
  }, [open, editingPersonel?.id])

  function set(key: keyof FormState, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function kaydet() {
    if (!form.ad.trim() || !form.soyad.trim()) return
    setSaving(true)
    try {
      const isEdit = !!editingPersonel
      const body = {
        ...(isEdit ? { id: editingPersonel!.id } : {}),
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        gorevi: form.gorevi,
        rolGrubu: form.rolGrubu,
        bagliOlduguId: form.bagliOlduguId || null,
        calismaYili: parseInt(form.calismaYili) || 0,
        telefon: form.telefon.trim(),
        email: form.email.trim(),
        ...(form.password ? { password: form.password } : {}),
        brutMaas: parseFloat(form.brutMaas) || 0,
        sgkOrani: parseFloat(form.sgkOrani) || 20.5,
        iseBaslamaTarihi: form.iseBaslamaTarihi || null,
        gunlukCalismaGun: parseInt(form.gunlukCalismaGun) || 5,
      }

      const res = await fetch("/api/personel", {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) {
        alert(json.hata || "Personel kaydedilemedi.")
        return
      }

      onClose()
      onSaved(json.personel?.id || editingPersonel?.id)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const brutSayi = parseFloat(form.brutMaas) || 0
  const sgkSayi = parseFloat(form.sgkOrani) || 20.5
  const toplamMaliyet = brutSayi > 0 ? Math.round(brutSayi * (1 + sgkSayi / 100)) : 0

  const digerPersoneller = personeller.filter((p) => p.id !== editingPersonel?.id)

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-800 bg-[#0B1120] p-5 text-white shadow-2xl md:p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.22em] text-slate-500 uppercase">Personel</p>
            <h2 className="mt-1 text-xl font-semibold">
              {editingPersonel ? "Personel Düzenle" : "Yeni Personel"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Kapat
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* ── Kimlik ── */}
          <Field label="Ad">
            <input value={form.ad} onChange={(e) => set("ad", e.target.value)} className={iCls} />
          </Field>
          <Field label="Soyad">
            <input value={form.soyad} onChange={(e) => set("soyad", e.target.value)} className={iCls} />
          </Field>

          <Field label="Görevi">
            <select value={form.gorevi} onChange={(e) => set("gorevi", e.target.value)} className={iCls}>
              {GOREVLER.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>

          <Field label="Rol Grubu">
            <select value={form.rolGrubu} onChange={(e) => set("rolGrubu", e.target.value)} className={iCls}>
              {ROL_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Bağlı Olduğu">
            <select
              value={form.bagliOlduguId}
              onChange={(e) => set("bagliOlduguId", e.target.value)}
              className={iCls}
            >
              <option value="">Bağımsız</option>
              {digerPersoneller.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad} {p.soyad}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Çalışma Yılı">
            <input
              type="number"
              min="0"
              value={form.calismaYili}
              onChange={(e) => set("calismaYili", e.target.value)}
              className={iCls}
            />
          </Field>

          {/* ── İletişim ── */}
          <Field label="Telefon">
            <input
              type="tel"
              value={form.telefon}
              onChange={(e) => set("telefon", e.target.value)}
              className={iCls}
            />
          </Field>
          <Field label="E-posta">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={iCls}
            />
          </Field>
          <Field label={editingPersonel ? "Yeni Şifre (boş = değişmez)" : "Giriş Şifresi"}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={iCls}
            />
          </Field>

          {/* ── Maliyet & Kapasite ── */}
          <div className="col-span-1 md:col-span-2">
            <p className="border-t border-slate-800 pt-3 text-xs uppercase tracking-widest text-slate-500">
              Maliyet & Kapasite
            </p>
          </div>

          <Field label="Brüt Maaş (₺ / ay)">
            <input
              type="number"
              min="0"
              step="100"
              value={form.brutMaas}
              onChange={(e) => set("brutMaas", e.target.value)}
              placeholder="0"
              className={iCls}
            />
          </Field>

          <Field label="İşveren SGK Oranı (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.sgkOrani}
              onChange={(e) => set("sgkOrani", e.target.value)}
              className={iCls}
            />
          </Field>

          <Field label="İşe Başlama Tarihi">
            <input
              type="date"
              value={form.iseBaslamaTarihi}
              onChange={(e) => set("iseBaslamaTarihi", e.target.value)}
              className={iCls}
            />
          </Field>

          <Field label="Haftalık Çalışma Günü (1–7)">
            <input
              type="number"
              min="1"
              max="7"
              value={form.gunlukCalismaGun}
              onChange={(e) => set("gunlukCalismaGun", e.target.value)}
              className={iCls}
            />
          </Field>
        </div>

        {/* Canlı maliyet önizleme */}
        {brutSayi > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-700 bg-[#111827] px-4 py-3">
            <p className="text-xs text-slate-500">Hesaplanan aylık toplam maliyet</p>
            <p className="mt-1 text-base font-bold text-white">
              {toplamMaliyet.toLocaleString("tr-TR")} ₺
              <span className="ml-2 text-xs font-normal text-slate-400">
                (Brüt + %{sgkSayi.toFixed(1)} işveren SGK)
              </span>
            </p>
          </div>
        )}

        <button
          onClick={kaydet}
          disabled={saving || !form.ad.trim() || !form.soyad.trim()}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-semibold transition hover:bg-emerald-500 disabled:bg-slate-700"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  )
}
