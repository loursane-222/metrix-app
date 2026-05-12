import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isAllowedMimeType(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function safeFileName(name: string) {
  return String(name || "plan")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "plan";
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });

    if (!hasCloudinaryConfig()) {
      return NextResponse.json({ hata: "Upload servisi yapılandırılmamış." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = (formData.get("file") || formData.get("plan")) as File | null;

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ hata: "Dosya bulunamadı." }, { status: 400 });
    }

    const mimeType = String(file.type || "");
    if (!isAllowedMimeType(mimeType)) {
      return NextResponse.json({ hata: "Sadece PDF veya görsel dosyası yüklenebilir." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ hata: "Dosya boş görünüyor." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ hata: "Dosya boyutu 15 MB sınırını aşıyor." }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalName = file.name || "plan";
    const publicId = `${Date.now()}-${safeFileName(originalName)}`;

    const result = await new Promise<{
      secure_url: string;
      public_id: string;
      bytes: number;
      resource_type: string;
    }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `metrix-planlar/${auth.atolyeId}`,
            public_id: publicId,
            resource_type: "auto",
            overwrite: false,
          },
          (error, uploadResult) => {
            if (error || !uploadResult) reject(error || new Error("Upload başarısız."));
            else resolve(uploadResult as {
              secure_url: string;
              public_id: string;
              bytes: number;
              resource_type: string;
            });
          }
        )
        .end(buffer);
    });

    return NextResponse.json({
      ok: true,
      file: {
        url: result.secure_url,
        publicId: result.public_id,
        mimeType,
        size: result.bytes || file.size,
        originalName,
      },
    });
  } catch {
    return NextResponse.json({ hata: "Dosya yüklenemedi." }, { status: 500 });
  }
}
