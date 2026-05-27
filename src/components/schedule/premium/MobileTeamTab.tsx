type MobileTeamTabProps = {
  tasks: any[];
  personelSayisi: number;
  onSelectTask: (task: any) => void;
};

export function MobileTeamTab({ tasks, personelSayisi, onSelectTask }: MobileTeamTabProps) {
  const personelMap = new Map<string, { ad: string; gorevler: any[] }>();
  tasks.forEach(task => {
    if (task.fazAtamalari?.length > 0) {
      task.fazAtamalari.forEach((a: any) => {
        const key = String(a?.personelId || a?.personel?.id || "bilinmiyor");
        const ad = [a?.personel?.ad, a?.personel?.soyad].filter(Boolean).join(" ") || "Bilinmiyor";
        if (!personelMap.has(key)) personelMap.set(key, { ad, gorevler: [] });
        personelMap.get(key)!.gorevler.push(task);
      });
    }
  });
  const personelList = Array.from(personelMap.entries()).map(([id, val]) => ({ id, ...val })).sort((a, b) => b.gorevler.length - a.gorevler.length);

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3">
          <div className="text-[10px] text-blue-300">Personel</div>
          <div className="mt-0.5 text-2xl font-black text-blue-300">{personelSayisi}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="text-[10px] text-amber-300">Atanmış</div>
          <div className="mt-0.5 text-2xl font-black text-amber-300">{personelList.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="text-[10px] text-slate-400">Toplam İş</div>
          <div className="mt-0.5 text-2xl font-black text-white">{tasks.length}</div>
        </div>
      </div>
      {personelList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
          <div className="text-2xl">👥</div>
          <div className="mt-2 text-sm">Henüz personel ataması yok</div>
        </div>
      ) : (
        <div className="space-y-2">
          {personelList.map(p => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">
                    {p.ad.charAt(0)}
                  </div>
                  <div className="text-sm font-semibold text-white">{p.ad}</div>
                </div>
                <div className="text-xs text-slate-400">{p.gorevler.length} iş</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.gorevler.slice(0, 3).map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-300"
                  >
                    {t.title}
                  </button>
                ))}
                {p.gorevler.length > 3 && (
                  <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-500">
                    +{p.gorevler.length - 3} daha
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
