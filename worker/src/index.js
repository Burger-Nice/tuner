// airglow accounts: the Worker's entry. The routes are in router.js (the main module may export only handlers).
import { handle } from './router.js';
import { housekeeping } from './cron.js';

export default {
  fetch: (req, env) => handle(req, env),
  scheduled: (ev, env, ctx) => ctx.waitUntil(housekeeping(env)),
};
