import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import xrkconfig from './components/xrkconfig.js';

// ========== 检查依赖是否缺失 ==========
async function checkDependencies() {
  for (let i of ['axios', 'uuid', 'crypto', 'form-data', 'sqlite', 'node-schedule']) {
    try {
      await import(i);
    } catch (error) {
      if (error.stack?.includes('Cannot find package')) {
        logger.warn('--------xrk依赖缺失--------');
        logger.warn(`XRK-plugin 缺少依赖 ${i}`);
        logger.warn(`如需使用请运行：${chalk.red(`pnpm add ${i} -w`)}`);
        logger.warn('---------------------------');
      } else {
        logger.error(`向日葵插件载入依赖错误：${chalk.red(i)}`);
        logger.error(decodeURI(error.stack));
      }
    }
  }
}

checkDependencies();

// ========== 清理凭证文件 ==========
const _path = process.cwd();
const CREDENTIALS_PATH = path.join(_path, 'data', 'xrkconfig', '.xrk', 'credentials.json');
const LAST_CLEAN_PATH = path.join(_path, 'data', 'xrkconfig', '.xrk', 'last_clean.txt');

function getTodayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function cleanCredentialsIfNeeded() {
  try {
    let lastCleanDate = '';
    try {
      lastCleanDate = fs.readFileSync(LAST_CLEAN_PATH, 'utf8');
    } catch (e) {
      // 文件不存在，继续
    }
    
    const today = getTodayString();
    if (lastCleanDate !== today) {
      if (fs.existsSync(CREDENTIALS_PATH)) {
        fs.unlinkSync(CREDENTIALS_PATH);
        console.log(chalk.gray('[Credentials] 已清理过期凭证'));
      }
      
      const dir = path.dirname(LAST_CLEAN_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LAST_CLEAN_PATH, today);
    }
  } catch (err) {
    logger.error(chalk.red('[Credentials] 清理文件出错:'), err);
  }
}

cleanCredentialsIfNeeded();

// ========== 初始化日志 ==========
logger.info(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
logger.info(chalk.yellow('【向日葵插件初始化】'));
logger.info(chalk.cyan('现在只为葵崽服务了呢~'));
logger.info(chalk.magenta('发送 向日葵帮助 解锁功能'));
logger.info(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

// ========== 加载插件 ==========
// 兼容 XRK-plugin 目录结构，避免旧路径 ./plugins/XRK/apps 报错
const pluginRoot = path.join(_path, 'plugins', 'XRK-plugin');
const appsDir = path.join(pluginRoot, 'apps');

let files = [];

try {
  files = fs.readdirSync(appsDir).filter((file) => file.endsWith('.js'));
} catch (err) {
  logger.error(chalk.red(`[XRK-plugin] 扫描应用目录失败: ${appsDir}`));
  logger.error(err);
  files = [];
}

let ret = [];
files.forEach((file) => {
  ret.push(import(`./apps/${file}`));
});

ret = await Promise.allSettled(ret);

let apps = {};
for (let i in files) {
  let name = files[i].replace('.js', '');
  
  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${chalk.red(name)}`);
    logger.error(ret[i].reason);
    continue;
  }
  
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]];
}

logger.info(chalk.green(`✅ 成功加载 ${Object.keys(apps).length} 个插件`));
logger.info(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

// ========== 导出配置和应用 ==========
const config = xrkconfig.config;
export { apps, config };