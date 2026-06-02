import type { JobDraft } from "./domain";
import type { JobV5SaveMode } from "./save";

export type SaveJobV5DraftClientInput = {
  job: JobDraft;
  title: string;
  jobId?: string;
  fetch?: FetchLike;
};

export type SaveJobV5DraftClientResponse = {
  success: true;
  jobId: string;
  mode: JobV5SaveMode;
};

export type SaveJobV5DraftClientErrorStatus = 400 | 401 | 403 | 404 | 500;

export class JobV5ClientError extends Error {
  constructor(
    message: string,
    public readonly status: SaveJobV5DraftClientErrorStatus,
  ) {
    super(message);
    this.name = "JobV5ClientError";
  }
}

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export async function saveJobV5Draft(
  input: SaveJobV5DraftClientInput,
): Promise<SaveJobV5DraftClientResponse> {
  const fetcher = input.fetch ?? globalThis.fetch;

  if (!fetcher) {
    throw new JobV5ClientError("Fetch is not available", 500);
  }

  const response = await fetcher("/api/yeni-is-v5/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job: input.job,
      title: input.title,
      jobId: input.jobId,
    }),
  });
  const body = await readJson(response);

  if (!response.ok) {
    throw new JobV5ClientError(readErrorMessage(body), normalizeErrorStatus(response.status));
  }

  if (!isRecord(body) || body.success !== true || typeof body.jobId !== "string" || !isSaveMode(body.mode)) {
    throw new JobV5ClientError("Invalid V5 save response", 500);
  }

  return {
    success: true,
    jobId: body.jobId,
    mode: body.mode,
  };
}

async function readJson(response: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readErrorMessage(body: unknown): string {
  if (isRecord(body) && typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error;
  }

  return "V5 job save failed";
}

function normalizeErrorStatus(status: number): SaveJobV5DraftClientErrorStatus {
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return status;
  }

  return 500;
}

function isSaveMode(value: unknown): value is JobV5SaveMode {
  return value === "create" || value === "update";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
