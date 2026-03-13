import { Effect } from "effect";
import type { HandlerFn } from "./router.js";
import type { PreviredService } from "../services/previred-service.js";
import type { PreviredRepo } from "../repos/previred-repo.js";
import {
  createdResponse,
  toErrorResponseFromUnknown,
} from "../core/effect/http-response.js";

export function createPreviredHandlers(deps: {
  previredService: PreviredService;
  previredRepo: PreviredRepo;
}) {
  const { previredService, previredRepo } = deps;

  const generatePrevired: HandlerFn = async (_req, ctx) => {
    try {
      const result = await Effect.runPromise(
        previredService.generate(ctx.tenantId, ctx.params.runId!),
      );
      return createdResponse({
        id: result.id,
        payrollRunId: result.payrollRunId,
        createdAt: result.createdAt,
      });
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const downloadPrevired: HandlerFn = async (_req, ctx) => {
    try {
      const file = await Effect.runPromise(
        previredRepo.getById(ctx.tenantId, ctx.params.id!),
      );
      return new Response(file.fileContent, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="previred-${file.payrollRunId}.txt"`,
        },
      });
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  return { generatePrevired, downloadPrevired };
}
