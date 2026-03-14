import { Effect } from "effect";
import type { HandlerFn } from "./router.js";
import type { PreviredService } from "../services/previred-service.js";
import type { PreviredRepo } from "../repos/previred-repo.js";
import {
  createdResponse,
  handleEffect,
} from "../core/effect/http-response.js";

export function createPreviredHandlers(deps: {
  previredService: PreviredService;
  previredRepo: PreviredRepo;
}) {
  const { previredService, previredRepo } = deps;

  const generatePrevired: HandlerFn = (_req, ctx) =>
    handleEffect(
      previredService.generate(ctx.tenantId, ctx.params.runId!).pipe(
        Effect.map((result) => ({
          id: result.id,
          payrollRunId: result.payrollRunId,
          createdAt: result.createdAt,
        })),
      ),
      createdResponse,
    );

  const downloadPrevired: HandlerFn = (_req, ctx) =>
    handleEffect(
      previredRepo.getById(ctx.tenantId, ctx.params.id!),
      (file) =>
        new Response(file.fileContent, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="previred-${file.payrollRunId}.txt"`,
          },
        }),
    );

  return { generatePrevired, downloadPrevired };
}
