import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";
import { createEmployeeHandlers } from "../../src/handlers/employee-handlers";
import { ValidationError, NotFoundError } from "../../src/core/effect/app-error";

// ── Mock deps ──

function makeMockDeps() {
  return {
    employeeService: {
      create: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn(),
    },
    employeeRepo: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn(),
    },
  };
}

function makeRequest(method: string, url: string, body?: unknown): Request {
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
}

describe("employee-handlers", () => {
  describe("createEmployee", () => {
    it("returns 400 for invalid body (missing required fields)", async () => {
      const deps = makeMockDeps();
      const handlers = createEmployeeHandlers(deps as any);

      const req = makeRequest("POST", "http://localhost/employees", {
        firstName: "Juan",
        // missing rut, lastName, hireDate, baseSalary, afpCode
      });

      const res = await handlers.createEmployee(req, {
        tenantId: "t1",
        params: {},
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error._type).toBe("ValidationError");
      expect(body.error.fieldErrors).toBeDefined();
    });

    it("returns 201 for valid body", async () => {
      const deps = makeMockDeps();
      const mockEmployee = { id: "e1", rut: "12345678-5", firstName: "Juan", lastName: "Pérez" };
      deps.employeeService.create.mockReturnValue(
        Effect.succeed(mockEmployee),
      );
      const handlers = createEmployeeHandlers(deps as any);

      const req = makeRequest("POST", "http://localhost/employees", {
        rut: "12345678-5",
        firstName: "Juan",
        lastName: "Pérez",
        hireDate: "2024-01-01",
        baseSalary: 1000000,
        afpCode: "capital",
      });

      const res = await handlers.createEmployee(req, {
        tenantId: "t1",
        params: {},
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe("e1");
    });
  });

  describe("updateEmployee", () => {
    it("returns 400 for invalid body", async () => {
      const deps = makeMockDeps();
      const handlers = createEmployeeHandlers(deps as any);

      const req = makeRequest("PUT", "http://localhost/employees/e1", {
        baseSalary: "not-a-number", // should be integer
      });

      const res = await handlers.updateEmployee(req, {
        tenantId: "t1",
        params: { id: "e1" },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("listEmployees", () => {
    it("returns 200 with employee list", async () => {
      const deps = makeMockDeps();
      deps.employeeRepo.list.mockReturnValue(
        Effect.succeed([{ id: "e1", firstName: "Juan" }]),
      );
      const handlers = createEmployeeHandlers(deps as any);

      const req = makeRequest("GET", "http://localhost/employees");
      const res = await handlers.listEmployees(req, {
        tenantId: "t1",
        params: {},
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
    });
  });

  describe("getEmployee", () => {
    it("returns 200 for existing employee", async () => {
      const deps = makeMockDeps();
      deps.employeeRepo.getById.mockReturnValue(
        Effect.succeed({ id: "e1", firstName: "Juan" }),
      );
      const handlers = createEmployeeHandlers(deps as any);

      const req = makeRequest("GET", "http://localhost/employees/e1");
      const res = await handlers.getEmployee(req, {
        tenantId: "t1",
        params: { id: "e1" },
      });

      expect(res.status).toBe(200);
    });

    it("returns 404 for unknown employee", async () => {
      const deps = makeMockDeps();
      deps.employeeRepo.getById.mockReturnValue(
        Effect.fail(NotFoundError.make("Employee", "e1")),
      );
      const handlers = createEmployeeHandlers(deps as any);

      const req = makeRequest("GET", "http://localhost/employees/e1");
      const res = await handlers.getEmployee(req, {
        tenantId: "t1",
        params: { id: "e1" },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error._type).toBe("NotFoundError");
    });
  });

  describe("deactivateEmployee", () => {
    it("returns 200 on success", async () => {
      const deps = makeMockDeps();
      deps.employeeService.deactivate.mockReturnValue(
        Effect.succeed({ id: "e1", isActive: false }),
      );
      const handlers = createEmployeeHandlers(deps as any);

      const req = makeRequest("DELETE", "http://localhost/employees/e1");
      const res = await handlers.deactivateEmployee(req, {
        tenantId: "t1",
        params: { id: "e1" },
      });

      expect(res.status).toBe(200);
    });
  });
});
