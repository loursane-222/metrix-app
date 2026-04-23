"use client";

import Card from "../ui/Card";

export default function Actions() {
  return (
    <Card>
      <ul className="space-y-2 text-sm">
        <li>⚠️ 11 teklif bekliyor</li>
        <li>📉 Onay oranı düşük</li>
        <li>💰 Tahsilat geride</li>
      </ul>
    </Card>
  );
}
