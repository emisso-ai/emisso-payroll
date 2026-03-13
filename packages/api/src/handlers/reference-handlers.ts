import { Effect } from "effect";
import type { HandlerFn } from "./router.js";
import type { ReferenceService } from "../services/reference-service.js";
import type { ReferenceRepo } from "../repos/reference-repo.js";
import { UpsertIndicatorsSchema } from "../validation/schemas.js";
import { ValidationError } from "../core/effect/app-error.js";
import {
  jsonResponse,
  handleEffect,
} from "../core/effect/http-response.js";

export function createReferenceHandlers(deps: {
  referenceService: ReferenceService;
  referenceRepo: ReferenceRepo;
}) {
  const { referenceService, referenceRepo } = deps;

  const getReferenceData: HandlerFn = (_req, ctx) => {
    const url = new URL(_req.url);
    const date = url.searchParams.get("date") ?? undefined;
    return handleEffect(referenceService.buildReferenceData(date));
  };

  const upsertReferenceData: HandlerFn = (req, _ctx) =>
    handleEffect(
      Effect.gen(function* () {
        const body = yield* Effect.tryPromise({
          try: () => req.json(),
          catch: () => ValidationError.make("Invalid JSON body"),
        });
        const parsed = UpsertIndicatorsSchema.safeParse(body);
        if (!parsed.success) {
          return yield* Effect.fail(
            ValidationError.fromZodErrors("Invalid indicators data", parsed.error.issues),
          );
        }
        return yield* referenceRepo.upsertIndicators({
          effectiveDate: parsed.data.effectiveDate,
          uf: String(parsed.data.uf),
          utm: String(parsed.data.utm),
          uta: String(parsed.data.uta),
          imm: String(parsed.data.imm),
        });
      }),
    );

  return { getReferenceData, upsertReferenceData };
}
