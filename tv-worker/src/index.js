import { handle } from './core.js';

export default {
  async fetch(request, env /*, ctx */) {
    return handle(request, env || {});
  },
};
