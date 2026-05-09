import { Hono } from "hono";
import { ServiceRepository } from "./serviceRepository";
import type { CreateServiceInput, UpdateServiceInput } from "@local-dashboard/shared";

export const servicesRouter = new Hono();

servicesRouter.get("/", (c) => {
  const tags = c.req.query("tags");
  const source = c.req.query("source");
  const services = ServiceRepository.findAll({ tags, source });
  return c.json(services);
});

servicesRouter.get("/:id", (c) => {
  const service = ServiceRepository.findById(c.req.param("id"));
  if (!service) return c.json({ error: "Not found" }, 404);
  return c.json(service);
});

servicesRouter.post("/", async (c) => {
  const body = await c.req.json<CreateServiceInput>();
  if (!body.name || !body.url) {
    return c.json({ error: "name and url are required" }, 400);
  }
  const service = ServiceRepository.create(body);
  return c.json(service, 201);
});

servicesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<UpdateServiceInput>();
  const updated = ServiceRepository.update(id, body);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

servicesRouter.delete("/:id", (c) => {
  const deleted = ServiceRepository.delete(c.req.param("id"));
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return new Response(null, { status: 204 });
});
