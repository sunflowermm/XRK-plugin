/**
 * 插件运行时绑定：监听 XRK-Hub 配置变更，热更新 priority / 定时任务等
 */
import schedule from 'node-schedule';
import hub from './xrk-hub.js';

/**
 * @param {import('../../../lib/plugins/plugin.js').default} pluginInst
 * @param {{ events?: string[], apply?: () => void }} spec
 */
export function bindHub(pluginInst, spec = {}) {
  const events = spec.events || ['config'];
  const hook = {
    events,
    apply: () => {
      try {
        spec.apply?.(pluginInst, hub);
      } catch (e) {
        logger.error(`[XRK-Hub] bindHub apply 失败 (${pluginInst?.name}):`, e);
      }
    }
  };
  hub.registerRuntime(hook);
  return hook;
}

/**
 * 重载插件实例上的 node-schedule 任务（早报、整点报时等）
 * @param {object} pluginInst
 * @param {{ name?: string, cron: string | (() => string), fnc: Function, log?: boolean }} spec
 */
export function rescheduleTask(pluginInst, spec) {
  const task = pluginInst.task;
  if (!task?.fnc) return;
  const cron = typeof spec.cron === 'function' ? spec.cron() : spec.cron;
  if (!cron) return;

  if (task.job?.cancel) task.job.cancel();

  task.name = spec.name ?? task.name;
  task.cron = cron;
  task.log = spec.log ?? task.log ?? false;

  const cronExp = cron.split(/\s+/).slice(0, 6).join(' ');
  const fnc = spec.fnc.bind(pluginInst);
  task.job = schedule.scheduleJob(cronExp, async () => {
    try {
      await fnc();
    } catch (err) {
      logger.error(`[XRK-Hub] 定时任务 ${task.name} 执行失败:`, err);
    }
  });
  logger.debug(`[XRK-Hub] 已重载定时任务 ${task.name} → ${cronExp}`);
}
