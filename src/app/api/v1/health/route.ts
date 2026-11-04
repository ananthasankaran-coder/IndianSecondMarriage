import { apiHandler } from "../../../../server/http/api-handler.ts";

export const dynamic = "force-dynamic";

/** Liveness probe. Deliberately reveals nothing about configuration or data. */
export const GET = apiHandler(async () => ({ data: { status: "ok" as const } }));
