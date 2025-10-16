import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errors } from './errors';

/**
 * Validation middleware factory using Zod schemas
 * @param schema - Zod schema to validate against
 * @param source - Which part of the request to validate ('body' | 'query' | 'params')
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(errors.badRequest(`Validation failed: ${messages}`));
      } else {
        next(errors.badRequest('Invalid request data'));
      }
    }
  };
}
