import { buildJobV5PersistencePlan } from "./persistence";
import type {
  BuildJobV5PersistencePlanInput,
  JobV5PersistencePlan,
  JobV5PersistenceJobRecord,
} from "./persistence";

export type JobV5SaveMode = "create" | "update";

export type SaveJobV5DraftInput = BuildJobV5PersistencePlanInput & {
  mode: JobV5SaveMode;
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
