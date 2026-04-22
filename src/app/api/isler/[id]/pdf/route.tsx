import { NextResponse } from "next/server";
import React from "react";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: "#4B5563",
  },
  section: {
    marginBottom: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  row: {
    marginBottom: 4,
  },
  label: {
    fontWeight: "bold",
  },
  totalBox: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 4,
  },
  grandTotal: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "bold",
  },
});

function formatNumber(value: unknown) {
  if (value === null || value === undefined) return "-";
  return String(value);
}

function OfferPDF({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Fiyat Teklifi</Text>
          <Text style={styles.subtitle}>Metrix Atölye Yönetim Sistemi</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genel Bilgiler</Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Teklif No: </Text>
            {formatNumber(data.teklifNo)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Müşteri Adı: </Text>
            {formatNumber(data.musteriAdi)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Ürün Adı: </Text>
            {formatNumber(data.urunAdi)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Malzeme Tipi: </Text>
            {formatNumber(data.malzemeTipi)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Müşteri Tipi: </Text>
            {formatNumber(data.musteriTipi)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Durum: </Text>
            {formatNumber(data.durum)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Üretim ve Ölçü Bilgileri</Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Metraj (Mtül): </Text>
            {formatNumber(data.metrajMtul)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Bir Mtül Dakika: </Text>
            {formatNumber(data.birMtulDakika)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Tezgah Arası Mtül: </Text>
            {formatNumber(data.tezgahArasiMtul)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Ada Tezgah Mtül: </Text>
            {formatNumber(data.adaTezgahMtul)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Plaka Genişlik (cm): </Text>
            {formatNumber(data.plakaGenislikCm)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Plaka Uzunluk (cm): </Text>
            {formatNumber(data.plakaUzunlukCm)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Plakadan Alınan Mtül: </Text>
            {formatNumber(data.plakadanAlinanMtul)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Kullanılan Plaka Sayısı: </Text>
            {formatNumber(data.kullanilanPlakaSayisi)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Toplam Süre (dk): </Text>
            {formatNumber(data.toplamSureDakika)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fiyat Bilgileri</Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Plaka Fiyatı Euro: </Text>
            {formatNumber(data.plakaFiyatiEuro)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Kullanılan Kur: </Text>
            {formatNumber(data.kullanilanKur)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>İşçilik Maliyeti: </Text>
            {formatNumber(data.iscilikMaliyeti)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Malzeme Maliyeti: </Text>
            {formatNumber(data.malzemeMaliyeti)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Toplam Maliyet: </Text>
            {formatNumber(data.toplamMaliyet)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>Kar Yüzdesi: </Text>
            {formatNumber(data.karYuzdesi)}
          </Text>

          <Text style={styles.row}>
            <Text style={styles.label}>KDV Tutarı: </Text>
            {formatNumber(data.kdvTutari)}
          </Text>

          <View style={styles.totalBox}>
            <Text style={styles.row}>
              <Text style={styles.label}>Satış Fiyatı: </Text>
              {formatNumber(data.satisFiyati)}
            </Text>

            <Text style={styles.row}>
              <Text style={styles.label}>Mtül Satış Fiyatı: </Text>
              {formatNumber(data.mtulSatisFiyati)}
            </Text>

            <Text style={styles.grandTotal}>
              KDV Dahil Fiyat: {formatNumber(data.kdvDahilFiyat)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notlar</Text>
          <Text>{data.notlar ? String(data.notlar) : "-"}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const isKaydi = await prisma.is.findUnique({
      where: { id },
    });

    if (!isKaydi) {
      return NextResponse.json({ error: "İş kaydı bulunamadı" }, { status: 404 });
    }

    const pdfBuffer = await pdf(<OfferPDF data={isKaydi} />).toBuffer();

    return new NextResponse(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="teklif-${isKaydi.teklifNo || isKaydi.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF route hatası:", error);
    return NextResponse.json({ error: "PDF oluşturulamadı" }, { status: 500 });
  }
}
