/**
 * 插件运行时绑定：监听 XRK-Hub 配置变更，热更新定时任务等
 * 注意：loader 每条消息会 new 插件实例，bindHub 必须按插件名去重，不可在构造函数里重复注册。
 */
import schedule from 'node-schedule';
import hub from './xrk-hub.js';

const boundKeys = new Set();
/** @type {Map<string, { cronExp: string, job: import('node-schedule').Job }>} */
const scheduledTasks = new Map();

/**
 * @param {import('../../../lib/plugins/plugin.js').default} pluginInst
 * @param {{ key?: string, events?: string[], apply?: (hub: typeof import('./xrk-hub.js').default) => void }} spec
 */
export function bindHub(pluginInst, spec = {}) {
  const key = spec.key || pluginInst?.name || pluginInst?.constructor?.name;
  if (!key || boundKeys.has(key)) return;
  boundKeys.add(key);

  const events = spec.events || ['config'];
  hub.registerRuntime({
    id: key,
    events,
    apply: () => {
      try {
        spec.apply?.(hub);
      } catch (e) {
        logger.error(`[XRK-Hub] bindHub apply 失败 (${key}):`, e);
      }
    }
  });
}

/**
 * 按任务名注册/更新 node-schedule（配置变更时调用；cron 未变则跳过）
 * @param {{ name: string, cron: string | (() => string), fnc: Function }} spec
 */
export function rescheduleTask(spec) {
  const name = spec.name;
  if (!name) return;
  const cron = typeof spec.cron === 'function' ? spec.cron() : spec.cron;
  if (!cron) return;

  const cronExp = cron.split(/\s+/).slice(0, 6).join(' ');
  const prev = scheduledTasks.get(name);
  if (prev?.cronExp === cronExp) return;

  prev?.job?.cancel?.();

  const job = schedule.scheduleJob(cronExp, async () => {
    try {
      await spec.fnc();
    } catch (err) {
      logger.error(`[XRK-Hub] 定时任务 ${name} 执行失败:`, err);
    }
  });

  scheduledTasks.set(name, { cronExp, job });
  logger.debug(`[XRK-Hub] 定时任务 ${name} → ${cronExp}`);
}
