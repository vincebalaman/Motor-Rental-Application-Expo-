import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === './booking-time') return next('./booking-time.ts', context);
  return next(specifier, context);
} });
