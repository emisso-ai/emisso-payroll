import { Effect } from "effect";
import type { HandlerFn } from "./router.js";
import type { ReferenceService } from "../services/reference-service.js";
import type { ReferenceRepo } from "../repos/reference-repo.js";
import { UpsertIndicatorsSchema } from "../validation/schemas.js";
import { ValidationError } from "../core/effect/app-error.js";
import {
  jsonResponse,
  toErrorResponseFromUnknown,
} from "../core/effect/http-response.js";

export function createReferenceHandlers(deps: {
  referenceService: ReferenceService;
  referenceRepo: ReferenceRepo;
}) {
  const { referenceService, referenceRepo } = deps;

  const getReferenceData: HandlerFn = async (_req, ctx) => {
    try {
      const url = new URL(_req.url);
      const date = url.searchParams.get("date") ?? undefined;
      const result = await Effect.runPromise(
        referenceService.buildReferenceData(date),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const upsertReferenceData: HandlerFn = async (req, _ctx) => {
    try {
      const body = await req.json();
      const parsed = UpsertIndicatorsSchema.safeParse(body);
      if (!parsed.success) {
        throw ValidationError.fromZodErrors(
          "Invalid indicators data",
          parsed.error.issues,
        );
      }
      const result = await Effect.runPromise(
        referenceRepo.upsertIndicators({
          effectiveDate: parsed.data.effectiveDate,
          uf: String(parsed.data.uf),
          utm: String(parsed.data.utm),
          uta: String(parsed.data.uta),
          imm: String(parsed.data.imm),
        }),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  return { getReferenceData, upsertReferenceData };
}
