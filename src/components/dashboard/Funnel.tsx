"use client";

import Card from "../ui/Card";

export default function Funnel() {
  return (
    <Card>
      <div className="flex justify-between text-center">
        <div>
          <p className="text-xl font-bold">15</p>
          <p className="text-xs text-gray-500">Teklif</p>
        </div>
        <div>→</div>
        <div>
          <p className="text-xl font-bold text-green-600">4</p>
          <p className="text-xs text-gray-500">Onay</p>
        </div>
        <div>→</div>
        <div>
          <p className="text-xl font-bold text-red-500">0</p>
          <p className="text-xs text-gray-500">Kaybedilen</p>
        </div>
      </div>
    </Card>
  );
}
