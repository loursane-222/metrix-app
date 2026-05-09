import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ hata: "Email gerekli." }, { status: 400 });

    const mevcutKullanici = await prisma.user.findUnique({ where: { email } });
    if (mevcutKullanici) {
      return NextResponse.json({ hata: "Bu e-posta adresi zaten kayıtlı." }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.deleteMany({ where: { email } });
    await prisma.emailVerification.create({ data: { email, code, expiresAt } });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Metrix Tezgah" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Metrix — E-posta Doğrulama Kodu",
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07101F;color:white;border-radius:16px"><h2 style="color:white;margin-bottom:8px">Metrix Tezgah</h2><p style="color:rgba(255,255,255,0.7)">Kayıt için doğrulama kodunuz:</p><div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#60a5fa;margin:24px 0;text-align:center">${code}</div><p style="color:rgba(255,255,255,0.5);font-size:12px">Bu kod 10 dakika geçerlidir. Siz bu işlemi yapmadıysanız dikkate almayın.</p></div>`,
    });

    return NextResponse.json({ mesaj: "Doğrulama kodu gönderildi." });
  } catch (e: any) {
    console.error("send-verification error:", e);
    return NextResponse.json({ hata: "Mail gönderilemedi: " + e.message }, { status: 500 });
  }
}
