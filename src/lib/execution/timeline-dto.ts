export type TimelineActor = {
  type: "PERSONEL" | "USER" | "SYSTEM" | "UNKNOWN";
  id: string | null;
  name: string | null;
};

export type TimelinePersonel = {
  ad: string;
  soyad: string;
};

export type TimelineEventDTO = {
  id: string;
  eventType: string;
  createdAt: Date | string;
  note: string | null;
  metadata: unknown;
  actor: TimelineActor | null;
  personel: TimelinePersonel | null;
  operationStep: string | null;
  transition: {
    from: string | null;
    to: string | null;
  };
  reasonCode: string | null;
  cost: {
    type: string | null;
    amount: string | number | null;
    currency: string | null;
  } | null;
  attachment: {
    url: string | null;
    type: string | null;
  } | null;
};

type TimelineRawEvent = {
  id: string;
  eventType: string;
  createdAt: Date | string;
  note: string | null;
  metadata: unknown;
  personelId: string | null;
  actorType: string | null;
  actorUserId: string | null;
  actorPersonelId: string | null;
  operationStep: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  reasonCode: string | null;
  costType: string | null;
  costAmount: unknown;
  currency: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
};

type TimelineActorMaps = {
  personelById: Record<string, TimelinePersonel>;
  userById: Record<string, { ad: string }>;
};

function personelName(personel: TimelinePersonel | null) {
  if (!personel) return null;
  return [personel.ad, personel.soyad].filter(Boolean).join(" ").trim() || null;
}

function resolveActor(event: TimelineRawEvent, maps: TimelineActorMaps): TimelineActor | null {
  if (event.actorType === "PERSONEL" && event.actorPersonelId) {
    const personel = maps.personelById[event.actorPersonelId] ?? null;
    return { type: "PERSONEL", id: event.actorPersonelId, name: personelName(personel) };
  }

  if (event.actorType === "USER" && event.actorUserId) {
    const user = maps.userById[event.actorUserId] ?? null;
    return { type: "USER", id: event.actorUserId, name: user?.ad || "Kullanıcı" };
  }

  if (event.actorType === "SYSTEM") {
    return { type: "SYSTEM", id: null, name: "Sistem" };
  }

  if (event.personelId) {
    const personel = maps.personelById[event.personelId] ?? null;
    return { type: "PERSONEL", id: event.personelId, name: personelName(personel) };
  }

  return null;
}

function decimalToValue(value: unknown): string | number | null {
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return value.toString();
  }
  return null;
}

export function mapTimelineEvents(
  events: TimelineRawEvent[],
  maps: TimelineActorMaps,
): TimelineEventDTO[] {
  return events.map((event) => {
    const personel = event.personelId ? (maps.personelById[event.personelId] ?? null) : null;
    const hasCost = event.costType != null || event.costAmount != null || event.currency != null;
    const hasAttachment = event.attachmentUrl != null || event.attachmentType != null;

    return {
      id: event.id,
      eventType: event.eventType,
      createdAt: event.createdAt,
      note: event.note,
      metadata: event.metadata,
      actor: resolveActor(event, maps),
      personel,
      operationStep: event.operationStep,
      transition: {
        from: event.fromStatus,
        to: event.toStatus,
      },
      reasonCode: event.reasonCode,
      cost: hasCost
        ? {
            type: event.costType,
            amount: decimalToValue(event.costAmount),
            currency: event.currency,
          }
        : null,
      attachment: hasAttachment
        ? {
            url: event.attachmentUrl,
            type: event.attachmentType,
          }
        : null,
    };
  });
}
