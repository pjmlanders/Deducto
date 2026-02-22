import { FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

/**
 * Validate request body/params/query with a Zod schema.
 * On success returns the parsed value; on failure sends 400 and returns undefined.
 */
export function validateWithZod<T>(
  reply: FastifyReply,
  schema: ZodSchema<T>,
  data: unknown
): T | undefined {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const err = result.error;
  const message = err.issues.map((e) => `${e.path.map(String).join('.')}: ${e.message}`).join('; ');
  reply.status(400).send({ error: 'Validation failed', details: message });
  return undefined;
}
