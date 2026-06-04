import cfg from '../../../lib/config/config.js';
import xrkconfig from './xrkconfig.js';

/** other.yaml masterQQ + config.yaml coremaster */
export function getMasterQQs() {
  const set = new Set((cfg.masterQQ || []).map(String).filter(Boolean));
  const core = xrkconfig.coremaster;
  if (core && Number(core) > 0) set.add(String(core));
  return [...set];
}
