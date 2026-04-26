"use client";

import { useState } from "react";

const PART_OPTIONS = [
  "tezgah",
  "tezgah arası",
  "L dönüş tezgah",
  "L tezgah arası",
  "L ön alın",
  "ada tezgah",
  "ada ayak",
  "ada iç dönüş",
  "ada dış dönüş",
  "ön alın",
  "davlumbaz",
  "tezgah ayak",
  "süpürgelik",
];

type Row = {
  parcaTuru: string;
  uzunluk: string;
  genislik: string;
};

type ProjectType = {
  id: number;
  tipAdi: string;
  adet: string;
  rows: Row[];
};

type Piece = {
  id: number;
  label: string;
  tipAdi?: string;
  parcaTuru?: string;
  damarGrubu?: string;
  genislik: number;
  yukseklik: number;
  x: number;
  y: number;
  slabIndex: number;
};

type Slab = {
  index: number;
  yerlesim: Piece[];
};

type LayoutData = {
  ok: boolean;
  slabs: Slab[];
  plakaSayisi: number;
  fireOrani: number;
  yorum: string;
};

const scale = 2;

function createEmptyRows(count = 5): Row[] {
  return Array.from({ length: count }, () => ({
    parcaTuru: "",
    uzunluk: "",
    genislik: "",
  }));
}

function createType(id: number): ProjectType {
  return {
    id,
    tipAdi: `Tip-${id}`,
    adet: "",
    rows: createEmptyRows(5),
  };
}

export default function Page() {
  const [plakaGenislik, setPlakaGenislik] = useState("");
  const [plakaYukseklik, setPlakaYukseklik] = useState("");
  const [plakaFiyati, setPlakaFiyati] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [types, setTypes] = useState<ProjectType[]>([createType(1)]);
  const [data, setData] = useState<LayoutData | null>(null);
  const [dragging, setDragging] = useState<{ slabIndex: number; pieceIndex: number } | null>(null);
  const [transferPiece, setTransferPiece] = useState<{ slabIndex: number; pieceIndex: number } | null>(null);

  const plakaGenislikNum = Number(plakaGenislik) || 0;
  const plakaYukseklikNum = Number(plakaYukseklik) || 0;
  const plakaFiyatiNum = Number(plakaFiyati) || 0;

  const toplamPlakaMaliyeti = data ? data.plakaSayisi * plakaFiyatiNum : 0;
  const fireMaliyeti = data ? (data.fireOrani / 100) * toplamPlakaMaliyeti : 0;

  const addType = () => {
    if (types.length >= 20) return;
    setTypes([...types, createType(types.length + 1)]);
  };

  const removeType = (id: number) => {
    if (types.length === 1) return;
    setTypes(types.filter((t) => t.id !== id));
  };

  const updateType = (id: number, patch: Partial<ProjectType>) => {
    setTypes(types.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const updateRow = (typeId: number, rowIndex: number, patch: Partial<Row>) => {
    setTypes(
      types.map((t) => {
        if (t.id !== typeId) return t;
        return {
          ...t,
          rows: t.rows.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)),
        };
      })
    );
  };

  const addRow = (typeId: number) => {
    setTypes(
      types.map((t) =>
        t.id === typeId
          ? { ...t, rows: [...t.rows, { parcaTuru: "", uzunluk: "", genislik: "" }] }
          : t
      )
    );
  };

  const onUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
  };

  const buildPieces = () => {
    const pieces: any[] = [];
    let id = 1;

    for (const tip of types) {
      const adet = Number(tip.adet) || 0;
      if (adet <= 0) continue;

      const validRows = tip.rows.filter(
        (r) => r.parcaTuru && Number(r.uzunluk) > 0 && Number(r.genislik) > 0
      );

      for (let n = 0; n < adet; n++) {
        for (const row of validRows) {
          pieces.push({
            id: id++,
            label: `${tip.tipAdi}-${n + 1} / ${row.parcaTuru}`,
            tipAdi: tip.tipAdi,
            parcaTuru: row.parcaTuru,
            genislik: Number(row.uzunluk),
            yukseklik: Number(row.genislik),
          });
        }
      }
    }

    return pieces;
  };

  const hesapla = async () => {
    const pieces = buildPieces();

    const res = await fetch("/api/ai-layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plaka: { genislik: plakaGenislikNum, yukseklik: plakaYukseklikNum },
        pieces,
      }),
    });

    const json = await res.json();
    setData(json);
  };

  const movePiece = (e: React.MouseEvent<HTMLDivElement>, slabIndex: number) => {
    if (!dragging || !data || dragging.slabIndex !== slabIndex) return;

    const board = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - board.left;
    const mouseY = e.clientY - board.top;

    setData({
      ...data,
      slabs: data.slabs.map((slab) => {
        if (slab.index !== slabIndex) return slab;

        return {
          ...slab,
          yerlesim: slab.yerlesim.map((p, i) =>
            i === dragging.pieceIndex
              ? {
                  ...p,
                  x: Math.max(0, Math.round(mouseX / scale - p.genislik / 2)),
                  y: Math.max(0, Math.round(mouseY / scale - p.yukseklik / 2)),
                }
              : p
          ),
        };
      }),
    });
  };

  const transferToSlab = (targetSlabIndex: number) => {
    if (!data || !transferPiece) return;

    const sourceSlab = data.slabs.find((s) => s.index === transferPiece.slabIndex);
    const targetSlab = data.slabs.find((s) => s.index === targetSlabIndex);
    if (!sourceSlab || !targetSlab) return;

    const piece = sourceSlab.yerlesim[transferPiece.pieceIndex];
    if (!piece) return;

    const movedPiece = {
      ...piece,
      slabIndex: targetSlabIndex,
      x: 0,
      y: 0,
    };

    setData({
      ...data,
      slabs: data.slabs.map((slab) => {
        if (slab.index === transferPiece.slabIndex) {
          return {
            ...slab,
            yerlesim: slab.yerlesim.filter((_, i) => i !== transferPiece.pieceIndex),
          };
        }

        if (slab.index === targetSlabIndex) {
          return {
            ...slab,
            yerlesim: [...slab.yerlesim, movedPiece],
          };
        }

        return slab;
      }),
    });

    setTransferPiece(null);
  };

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.badge}>METRIX AI / VEIN INTELLIGENCE</div>
          <h1 style={styles.title}>Toplu Proje Plaka Optimizasyonu</h1>
          <p style={styles.subtitle}>
            20 tipe kadar proje gir. Parça türlerini seç. Sistem tezgah, ön alın, tezgah arası ve ada ilişkilerini damar takibi mantığıyla aynı gruplarda yerleştirmeye çalışır.
          </p>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.grid}>
          <Input label="Plaka Genişlik cm" value={plakaGenislik} setValue={setPlakaGenislik} />
          <Input label="Plaka Yükseklik cm" value={plakaYukseklik} setValue={setPlakaYukseklik} />
          <Input label="Plaka Fiyatı €" value={plakaFiyati} setValue={setPlakaFiyati} />
          <label style={styles.label}>
            Gerçek Plaka Görseli
            <input style={styles.input} type="file" accept="image/*" onChange={onUploadImage} />
          </label>
        </div>

        <div style={styles.tipHeader}>
          <h2 style={{ margin: 0 }}>Proje Tipleri</h2>
          <button style={styles.secondaryButton} onClick={addType} disabled={types.length >= 20}>
            + Tip Ekle ({types.length}/20)
          </button>
        </div>

        <div style={styles.typesList}>
          {types.map((tip) => (
            <div key={tip.id} style={styles.typeCard}>
              <div style={styles.typeTop}>
                <Input label="Tip Adı" value={tip.tipAdi} setValue={(v: string) => updateType(tip.id, { tipAdi: v })} />
                <Input label="Adet" value={tip.adet} setValue={(v: string) => updateType(tip.id, { adet: v })} />
                <button style={styles.dangerButton} onClick={() => removeType(tip.id)}>
                  Sil
                </button>
              </div>

              <div style={styles.tableHead}>
                <div>Kesilecek Parça</div>
                <div>Uzunluk cm</div>
                <div>Genişlik cm</div>
              </div>

              {tip.rows.map((row, rowIndex) => (
                <div key={rowIndex} style={styles.rowGrid}>
                  <select
                    style={styles.input}
                    value={row.parcaTuru}
                    onChange={(e) => updateRow(tip.id, rowIndex, { parcaTuru: e.target.value })}
                  >
                    <option value="">Seçiniz</option>
                    {PART_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>

                  <input
                    style={styles.input}
                    value={row.uzunluk}
                    onChange={(e) => updateRow(tip.id, rowIndex, { uzunluk: e.target.value })}
                    type="text"
                    inputMode="decimal"
                  />

                  <input
                    style={styles.input}
                    value={row.genislik}
                    onChange={(e) => updateRow(tip.id, rowIndex, { genislik: e.target.value })}
                    type="text"
                    inputMode="decimal"
                  />
                </div>
              ))}

              <button style={styles.miniButton} onClick={() => addRow(tip.id)}>
                + Satır Ekle
              </button>
            </div>
          ))}
        </div>

        <button style={styles.button} onClick={hesapla}>
          Damar Takipli Yerleşimi Hesapla
        </button>
      </section>

      {transferPiece && data && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <h3 style={{ marginTop: 0 }}>Başka Plakaya Aktar</h3>
            <p style={{ color: "#6b5d4f", lineHeight: 1.5 }}>
              Seçili parçayı hangi plakaya göndermek istiyorsun?
            </p>

            <select
              style={styles.input}
              defaultValue=""
              onChange={(e) => {
                const target = Number(e.target.value);
                if (!Number.isNaN(target)) transferToSlab(target);
              }}
            >
              <option value="" disabled>Plaka seç</option>
              {data.slabs
                .filter((s) => s.index !== transferPiece.slabIndex)
                .map((s) => (
                  <option key={s.index} value={s.index}>
                    Plaka {s.index + 1}
                  </option>
                ))}
            </select>

            <button style={styles.modalCancel} onClick={() => setTransferPiece(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {data && (
        <>
          <section style={styles.metrics}>
            <Metric title="Toplam Plaka" value={`${data.plakaSayisi}`} />
            <Metric title="Toplam Plaka Maliyeti" value={`€${toplamPlakaMaliyeti.toFixed(2)}`} />
            <Metric title="Fire Oranı" value={`%${data.fireOrani.toFixed(2)}`} />
            <Metric title="Fire Maliyeti" value={`€${fireMaliyeti.toFixed(2)}`} />
          </section>

          <div style={styles.aiNote}>{data.yorum}</div>

          <section style={styles.slabs}>
            {data.slabs.map((slab) => (
              <div key={slab.index} style={styles.slabCard}>
                <h3 style={styles.slabTitle}>Plaka {slab.index + 1}</h3>

                <div
                  onMouseMove={(e) => movePiece(e, slab.index)}
                  onMouseUp={() => setDragging(null)}
                  onMouseLeave={() => setDragging(null)}
                  style={{
                    ...styles.slab,
                    width: plakaGenislikNum * scale,
                    height: plakaYukseklikNum * scale,
                    backgroundImage: imageUrl
                      ? `url(${imageUrl})`
                      : "linear-gradient(135deg, #d9d0c0 0%, #f8f1e7 32%, #b8ad9d 58%, #efe4d2 100%)",
                  }}
                >
                  {slab.yerlesim.map((p, i) => (
                    <div
                      key={p.id}
                      onMouseDown={() => setDragging({ slabIndex: slab.index, pieceIndex: i })}
                      onDoubleClick={() => setTransferPiece({ slabIndex: slab.index, pieceIndex: i })}
                      title={`${p.label} / ${p.damarGrubu || ""}`}
                      style={{
                        ...styles.piece,
                        left: p.x * scale,
                        top: p.y * scale,
                        width: p.genislik * scale,
                        height: p.yukseklik * scale,
                      }}
                    >
                      <span>{p.parcaTuru}</span>
                      <small>{p.genislik}x{p.yukseklik}</small>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function Input({ label, value, setValue }: any) {
  return (
    <label style={styles.label}>
      {label}
      <input
        style={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type="text"
        inputMode="decimal"
      />
    </label>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricTitle}>{title}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 40,
    background: "radial-gradient(circle at top left, #2b2118 0%, #0d0d0d 35%, #f4efe7 35%, #f4efe7 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#111",
  },
  hero: {
    maxWidth: 1220,
    margin: "0 auto 24px",
    color: "white",
  },
  badge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,.12)",
    border: "1px solid rgba(255,255,255,.22)",
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 14,
  },
  title: {
    fontSize: 48,
    margin: 0,
    letterSpacing: -1.5,
  },
  subtitle: {
    maxWidth: 880,
    lineHeight: 1.55,
    color: "rgba(255,255,255,.75)",
    fontSize: 17,
  },
  panel: {
    maxWidth: 1220,
    margin: "0 auto 24px",
    padding: 24,
    borderRadius: 28,
    background: "rgba(255,255,255,.94)",
    boxShadow: "0 30px 90px rgba(0,0,0,.18)",
    border: "1px solid rgba(255,255,255,.7)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  tipHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  typesList: {
    display: "grid",
    gap: 16,
  },
  typeCard: {
    padding: 18,
    borderRadius: 24,
    background: "#fbf8f2",
    border: "1px solid #eadfce",
  },
  typeTop: {
    display: "grid",
    gridTemplateColumns: "1fr 140px 90px",
    gap: 14,
    alignItems: "end",
    marginBottom: 16,
  },
  tableHead: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr",
    gap: 12,
    fontSize: 12,
    fontWeight: 900,
    color: "#6b5d4f",
    marginBottom: 8,
  },
  rowGrid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr",
    gap: 12,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: 800,
    color: "#4b4034",
  },
  input: {
    display: "block",
    width: "100%",
    marginTop: 7,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #d8cbb8",
    background: "white",
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    marginTop: 22,
    padding: "16px 26px",
    borderRadius: 16,
    border: 0,
    background: "linear-gradient(135deg, #111 0%, #4b3424 100%)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(0,0,0,.18)",
  },
  secondaryButton: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid #d8cbb8",
    background: "#111",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  dangerButton: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #f0b4b4",
    background: "#fff1f1",
    color: "#991b1b",
    fontWeight: 900,
    cursor: "pointer",
  },
  miniButton: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid #d8cbb8",
    background: "white",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  metrics: {
    maxWidth: 1220,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  metric: {
    padding: 20,
    borderRadius: 24,
    background: "white",
    boxShadow: "0 18px 50px rgba(0,0,0,.1)",
  },
  metricTitle: {
    color: "#7a6d5f",
    fontSize: 13,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: 950,
  },
  aiNote: {
    maxWidth: 1220,
    margin: "0 auto 22px",
    padding: 18,
    borderRadius: 22,
    background: "#111",
    color: "white",
  },
  slabs: {
    maxWidth: 1220,
    margin: "0 auto",
    display: "grid",
    gap: 28,
  },
  slabCard: {
    padding: 22,
    borderRadius: 28,
    background: "white",
    boxShadow: "0 24px 70px rgba(0,0,0,.12)",
    overflowX: "auto",
  },
  slabTitle: {
    marginTop: 0,
  },
  slab: {
    position: "relative",
    backgroundSize: "cover",
    backgroundPosition: "center",
    border: "3px solid #111",
    overflow: "hidden",
    userSelect: "none",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.5)",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    width: 420,
    maxWidth: "calc(100vw - 32px)",
    padding: 24,
    borderRadius: 24,
    background: "white",
    boxShadow: "0 30px 90px rgba(0,0,0,.35)",
  },
  modalCancel: {
    marginTop: 14,
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid #d8cbb8",
    background: "#fbf8f2",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  piece: {
    position: "absolute",
    border: "2px solid #e11d48",
    background: "rgba(225,29,72,.24)",
    color: "#111",
    fontWeight: 900,
    cursor: "grab",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(1px)",
    fontSize: 12,
    textAlign: "center",
    padding: 4,
    boxSizing: "border-box",
  },
};
