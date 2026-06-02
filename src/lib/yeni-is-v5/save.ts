import { buildJobV5PersistencePlan } from "./persistence";
import type {
  BuildJobV5PersistencePlanInput,
  JobV5PersistencePlan,
  JobV5PersistenceJobRecord,
} from "./persistence";
import type { JobDraft } from "./domain";

export type JobV5SaveMode = "create" | "update";

export type SaveJobV5DraftInput = BuildJobV5PersistencePlanInput & {
  mode: JobV5SaveMode;
  jobId?: string;
};

export type SaveJobV5DraftRequest = {
  job: JobDraft;
  title: string;
  jobId?: string;
};

export type SaveJobV5DraftResult = {
  jobId: string;
  mode: JobV5SaveMode;
  counts: {
    areas: number;
    products: number;
    pieces: number;
    materialSelections: number;
  };
};

export type JobV5SaveDbClient = {
  $transaction<T>(run: (tx: JobV5SaveTransactionClient) => Promise<T>): Promise<T>;
};

export type JobV5SaveTransactionClient = {
  jobV5: {
    findFirst(args: unknown): Promise<unknown | null>;
    create(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  jobV5Area: {
    createMany(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
  jobV5MaterialSelection: {
    createMany(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
  jobV5Product: {
    createMany(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
  jobV5Piece: {
    createMany(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
  musteri: {
    findFirst(args: unknown): Promise<unknown | null>;
  };
};

export class JobV5SaveError extends Error {
  constructor(
    message: string,
    public readonly code: "not-found" | "forbidden" | "invalid-input",
  ) {
    super(message);
    this.name = "JobV5SaveError";
  }
}

export function parseSaveJobV5DraftRequest(payload: unknown): SaveJobV5DraftRequest {
  if (!isRecord(payload)) {
    throw new JobV5SaveError("Request body must be an object", "invalid-input");
  }

  const title = readRequiredText(payload.title, "title");
  const jobId = payload.jobId == null ? undefined : readRequiredText(payload.jobId, "jobId");
  const job = parseJobDraft(payload.job);

  return { job, title, jobId };
}

export function buildSaveJobV5DraftInput(
  request: SaveJobV5DraftRequest,
  atolyeId: string,
): SaveJobV5DraftInput {
  return {
    job: request.job,
    atolyeId,
    title: request.title,
    jobId: request.jobId,
    mode: request.jobId ? "update" : "create",
  };
}

export function mapJobV5SaveError(error: unknown): { status: number; body: { success: false; error: string } } {
  if (error instanceof JobV5SaveError) {
    const statusByCode: Record<JobV5SaveError["code"], number> = {
      "invalid-input": 400,
      "not-found": 404,
      forbidden: 403,
    };

    return {
      status: statusByCode[error.code],
      body: { success: false, error: error.message },
    };
  }

  return {
    status: 500,
    body: { success: false, error: "V5 job save failed" },
  };
}

export async function saveJobV5Draft(
  db: JobV5SaveDbClient,
  input: SaveJobV5DraftInput,
): Promise<SaveJobV5DraftResult> {
  const initialPlan = buildJobV5PersistencePlan(input);
  const plan = input.jobId ? overridePersistencePlanJobId(initialPlan, input.jobId) : initialPlan;

  return db.$transaction(async (tx) => {
    await assertCustomerBelongsToAtolye(tx, plan.job.musteriId, plan.job.atolyeId);

    if (input.mode === "create") {
      await createJobV5Plan(tx, plan);
    } else {
      await assertJobV5BelongsToAtolye(tx, plan.job.id, plan.job.atolyeId);
      await replaceJobV5Plan(tx, plan);
    }

    return buildSaveResult(input.mode, plan);
  });
}

export async function createJobV5Plan(tx: JobV5SaveTransactionClient, plan: JobV5PersistencePlan): Promise<void> {
  await tx.jobV5.create({ data: plan.job });
  await createJobV5Children(tx, plan);
}

export async function replaceJobV5Plan(tx: JobV5SaveTransactionClient, plan: JobV5PersistencePlan): Promise<void> {
  await deleteJobV5Children(tx, plan.job.id);
  await tx.jobV5.update({
    where: { id: plan.job.id },
    data: withoutId(plan.job),
  });
  await createJobV5Children(tx, plan);
}

export async function assertJobV5BelongsToAtolye(
  tx: JobV5SaveTransactionClient,
  jobId: string,
  atolyeId: string,
): Promise<void> {
  const existing = await tx.jobV5.findFirst({
    where: { id: jobId, atolyeId },
    select: { id: true },
  });

  if (!existing) {
    throw new JobV5SaveError("JobV5 not found for atolye", "not-found");
  }
}

export async function assertCustomerBelongsToAtolye(
  tx: JobV5SaveTransactionClient,
  musteriId: string | null,
  atolyeId: string,
): Promise<void> {
  if (!musteriId) return;

  const existing = await tx.musteri.findFirst({
    where: { id: musteriId, atolyeId },
    select: { id: true },
  });

  if (!existing) {
    throw new JobV5SaveError("Customer does not belong to atolye", "forbidden");
  }
}

async function createJobV5Children(tx: JobV5SaveTransactionClient, plan: JobV5PersistencePlan): Promise<void> {
  await tx.jobV5Area.createMany({ data: plan.areas });
  await tx.jobV5MaterialSelection.createMany({ data: plan.materialSelections });
  await tx.jobV5Product.createMany({ data: plan.products });
  await tx.jobV5Piece.createMany({ data: plan.pieces });
}

async function deleteJobV5Children(tx: JobV5SaveTransactionClient, jobId: string): Promise<void> {
  await tx.jobV5Piece.deleteMany({ where: { jobId } });
  await tx.jobV5Product.deleteMany({ where: { jobId } });
  await tx.jobV5MaterialSelection.deleteMany({ where: { jobId } });
  await tx.jobV5Area.deleteMany({ where: { jobId } });
}

function overridePersistencePlanJobId(plan: JobV5PersistencePlan, jobId: string): JobV5PersistencePlan {
  return {
    ...plan,
    job: { ...plan.job, id: jobId },
    areas: plan.areas.map((area) => ({ ...area, jobId })),
    products: plan.products.map((product) => ({ ...product, jobId })),
    pieces: plan.pieces.map((piece) => ({ ...piece, jobId })),
    materialSelections: plan.materialSelections.map((materialSelection) => ({ ...materialSelection, jobId })),
  };
}

function buildSaveResult(mode: JobV5SaveMode, plan: JobV5PersistencePlan): SaveJobV5DraftResult {
  return {
    jobId: plan.job.id,
    mode,
    counts: {
      areas: plan.areas.length,
      products: plan.products.length,
      pieces: plan.pieces.length,
      materialSelections: plan.materialSelections.length,
    },
  };
}

function withoutId(record: JobV5PersistenceJobRecord): Omit<JobV5PersistenceJobRecord, "id"> {
  const { id: _id, ...data } = record;
  return data;
}

function parseJobDraft(value: unknown): JobDraft {
  if (!isRecord(value)) {
    throw new JobV5SaveError("job is required", "invalid-input");
  }

  readRequiredText(value.id, "job.id");

  if (!isRecord(value.customer)) {
    throw new JobV5SaveError("job.customer is required", "invalid-input");
  }

  readRequiredText(value.customer.name, "job.customer.name");

  if (!Array.isArray(value.areas)) {
    throw new JobV5SaveError("job.areas must be an array", "invalid-input");
  }

  if (!["draft", "ready", "quoted"].includes(String(value.status))) {
    throw new JobV5SaveError("job.status is invalid", "invalid-input");
  }

  for (const [areaIndex, area] of value.areas.entries()) {
    parseAreaDraft(area, areaIndex);
  }

  return value as JobDraft;
}

function parseAreaDraft(value: unknown, areaIndex: number): void {
  if (!isRecord(value)) {
    throw new JobV5SaveError(`job.areas[${areaIndex}] must be an object`, "invalid-input");
  }

  readRequiredText(value.id, `job.areas[${areaIndex}].id`);
  readRequiredText(value.name, `job.areas[${areaIndex}].name`);

  if (!Array.isArray(value.products)) {
    throw new JobV5SaveError(`job.areas[${areaIndex}].products must be an array`, "invalid-input");
  }

  for (const [productIndex, product] of value.products.entries()) {
    parseProductDraft(product, areaIndex, productIndex);
  }
}

function parseProductDraft(value: unknown, areaIndex: number, productIndex: number): void {
  if (!isRecord(value)) {
    throw new JobV5SaveError(
      `job.areas[${areaIndex}].products[${productIndex}] must be an object`,
      "invalid-input",
    );
  }

  readRequiredText(value.id, `job.areas[${areaIndex}].products[${productIndex}].id`);
  readRequiredText(value.name, `job.areas[${areaIndex}].products[${productIndex}].name`);
  parseMaterialSelectionDraft(
    value.defaultMaterialSelection,
    `job.areas[${areaIndex}].products[${productIndex}].defaultMaterialSelection`,
  );

  if (!Array.isArray(value.pieces)) {
    throw new JobV5SaveError(
      `job.areas[${areaIndex}].products[${productIndex}].pieces must be an array`,
      "invalid-input",
    );
  }

  for (const [pieceIndex, piece] of value.pieces.entries()) {
    parsePieceDraft(piece, areaIndex, productIndex, pieceIndex);
  }
}

function parsePieceDraft(value: unknown, areaIndex: number, productIndex: number, pieceIndex: number): void {
  if (!isRecord(value)) {
    throw new JobV5SaveError(
      `job.areas[${areaIndex}].products[${productIndex}].pieces[${pieceIndex}] must be an object`,
      "invalid-input",
    );
  }

  const path = `job.areas[${areaIndex}].products[${productIndex}].pieces[${pieceIndex}]`;
  readRequiredText(value.id, `${path}.id`);
  readRequiredText(value.label, `${path}.label`);
  readFiniteNumber(value.widthCm, `${path}.widthCm`);
  readFiniteNumber(value.heightCm, `${path}.heightCm`);
  readFiniteNumber(value.quantity, `${path}.quantity`);

  if (value.materialSelection != null) {
    parseMaterialSelectionDraft(value.materialSelection, `${path}.materialSelection`);
  }
}

function parseMaterialSelectionDraft(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new JobV5SaveError(`${path} must be an object`, "invalid-input");
  }

  readRequiredText(value.materialName, `${path}.materialName`);
  readRequiredText(value.source, `${path}.source`);
}

function readRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new JobV5SaveError(`${fieldName} is required`, "invalid-input");
  }

  return value.trim();
}

function readFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new JobV5SaveError(`${fieldName} must be a number`, "invalid-input");
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
