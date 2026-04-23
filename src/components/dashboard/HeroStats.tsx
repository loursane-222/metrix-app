"use client";

import Card from "../ui/Card";

export default function HeroStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <p className="text-sm text-gray-500">Toplam Ciro</p>
        <h2 className="text-2xl font-bold text-blue-600">₺596.409</h2>
      </Card>

      <Card>
        <p className="text-sm text-gray-500">Toplam Kar</p>
        <h2 className="text-2xl font-bold text-purple-600">₺199.927</h2>
      </Card>

      <Card>
        <p className="text-sm text-gray-500">Onay Oranı</p>
        <h2 className="text-2xl font-bold text-green-600">%26</h2>
      </Card>

      <Card>
        <p className="text-sm text-gray-500">Tahsilat</p>
        <h2 className="text-2xl font-bold text-teal-600">₺150.000</h2>
      </Card>
    </div>
  );
}
