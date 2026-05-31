export function normalizePhoneForWhatsapp(value: unknown) {
  let phone = String(value || "").replace(/\D/g, "");
  if (!phone) return "";
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("0")) phone = "90" + phone.slice(1);
  if (phone.length === 10 && phone.startsWith("5")) phone = "90" + phone;
  if (phone && !phone.startsWith("90")) phone = "90" + phone;
  return phone;
}

export function whatsappUrlForPhone(phone: unknown, message: string) {
  const normalized = normalizePhoneForWhatsapp(phone);
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
