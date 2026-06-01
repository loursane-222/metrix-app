import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/subscription/guard";
import {
  getDefaultCheckoutUrl,
  getPlanLabel,
  normalizePlan,
  PURCHASABLE_PLANS,
  type SubscriptionPlan,
} from "@/lib/subscription/plans";

function getConfiguredCheckoutUrl(plan: SubscriptionPlan): string | null {
  const envKey = `SUBSCRIPTION_CHECKOUT_${plan.toUpperCase()}_URL`;
  return process.env[envKey] || process.env.SUBSCRIPTION_CHECKOUT_URL || getDefaultCheckoutUrl(plan);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const requestedPlan = normalizePlan(body?.plan);

    if (!PURCHASABLE_PLANS.includes(requestedPlan)) {
      return NextResponse.json(
        { hata: "Geçersiz paket. Demo paketi satın alınamaz." },
        { status: 400 },
      );
    }

    const checkoutUrl = getConfiguredCheckoutUrl(requestedPlan);

    return NextResponse.json({
      checkoutUrl,
      plan: requestedPlan,
      planLabel: getPlanLabel(requestedPlan),
    });
  } catch (error) {
    console.error("subscription checkout error:", error);
    return NextResponse.json({ hata: "Ödeme başlatılamadı." }, { status: 500 });
  }
}
