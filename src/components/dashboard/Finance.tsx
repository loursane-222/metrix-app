"use client";

import Card from "../ui/Card";

export default function Finance() {
  return (
    <Card>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Ciro</span>
          <span>₺596.409</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span>Maliyet</span>
          <span>₺396.482</span>
        </div>
        <div className="flex justify-between text-purple-600">
          <span>Kar</span>
          <span>₺199.927</span>
        </div>
      </div>
    </Card>
  );
}
