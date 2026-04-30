'use client';

export default function Page() {
  return (
    <main className="km">
      <style jsx global>{`
        html,body{
          margin:0;
          background:#070f1b;
          color:#f4f7ff;
          font-family: Inter, system-ui;
        }

        .km{
          min-height:100vh;
          padding:32px;
          background:
            radial-gradient(circle at 20% 10%, rgba(124,60,255,.15), transparent 30%),
            radial-gradient(circle at 80% 20%, rgba(0,149,255,.10), transparent 40%),
            linear-gradient(#081421,#060d18);
        }

        h1{
          font-size:32px;
          margin-bottom:6px;
        }

        .sub{
          color:#aab6cb;
          margin-bottom:24px;
        }

        .grid{
          display:grid;
          grid-template-columns: repeat(4,1fr);
          gap:20px;
        }

        .card{
          background:linear-gradient(145deg, rgba(15,29,48,.9), rgba(8,18,32,.85));
          border:1px solid rgba(148,163,184,.15);
          border-radius:16px;
          padding:20px;
          box-shadow:0 20px 60px rgba(0,0,0,.25);
        }

        .big{
          grid-column: span 2;
        }

        .title{
          font-size:13px;
          color:#9fb0c7;
          margin-bottom:10px;
        }

        .value{
          font-size:28px;
          font-weight:800;
        }

        .list{
          margin-top:12px;
          font-size:14px;
          line-height:1.8;
          color:#cbd5e8;
        }

        .badge{
          display:inline-block;
          padding:4px 10px;
          border-radius:999px;
          background:rgba(124,60,255,.25);
          color:#b178ff;
          font-size:12px;
          font-weight:700;
          margin-left:8px;
        }

        @media(max-width:900px){
          .grid{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <h1>Kontrol Merkezi</h1>
      <div className="sub">Bugün, 28 Nisan</div>

      <div className="grid">
        <div className="card">
          <div className="title">Tahmini Kar</div>
          <div className="value">₺72.420</div>
        </div>

        <div className="card">
          <div className="title">Toplam Ciro</div>
          <div className="value">₺512.680</div>
        </div>

        <div className="card">
          <div className="title">Mtül Maliyeti</div>
          <div className="value">₺1.261</div>
        </div>

        <div className="card">
          <div className="title">Verimlilik</div>
          <div className="value">%69</div>
        </div>

        <div className="card big">
          <div className="title">
            Bugünkü Plan <span className="badge">6 görev</span>
          </div>
          <div className="list">
            09:00 Ölçü<br/>
            11:30 İmalat<br/>
            14:00 Taş Alımı<br/>
            16:30 Montaj
          </div>
        </div>

        <div className="card big">
          <div className="title">
            Bekleyen Teklifler <span className="badge">5 teklif</span>
          </div>
          <div className="list">
            DecoMar<br/>
            Vitra Showroom<br/>
            Sena İnşaat
          </div>
        </div>
      </div>
    </main>
  );
}
