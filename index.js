import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import chalk from 'chalk';

// ========== 检查依赖是否缺失 ==========
async function checkDependencies() {
  for (let i of ['axios', 'uuid', 'crypto', 'form-data', 'sqlite', 'node-schedule']) {
    try {
      await import(i);
    } catch (error) {
      if (error.stack?.includes('Cannot find package')) {
        logger.warn('--------xrk依赖缺失--------');
        logger.warn(`XRK 缺少依赖 ${i}`);
        logger.warn(`如需使用请运行：${logger.red(`pnpm add ${i} -w`)}`);
        logger.warn('---------------------------');
      } else {
        logger.error(`向日葵载入依赖错误：${logger.red(i)}`);
        logger.error(decodeURI(error.stack));
      }
    }
  }
}

checkDependencies();

// ========== 【1. 检查并生成配置文件】 ==========
const _path = process.cwd();
const configDir = path.join(_path, 'data', 'xrkconfig');
const configFile = path.join(configDir, 'config.yaml');

// 默认配置
const defaultConfig = {
  peopleai: false,
  time_groupss: [],
  news_groupss: [],
  news_pushtime: 8,
  screen_shot_quality: 1.5,
  help_priority: 500,
  coremaster: 12345678,
  emoji_filename: '孤独摇滚',
  screen_shot_http: false,
  thumwhiteList: [],
  sharing: true,
  selfcontrol: true,
  
  // ========== AI助手配置（优化版）==========
  ai: {
    // === 基础AI配置 ===
    apiKey: "YOUR_AI_API_KEY_HERE",
    baseUrl: "https://api.gptgod.online/v1",
    fileUploadUrl: "https://api.gptgod.online/v1/file",
    chatModel: "deepseek-ai/DeepSeek-V3",
    visionModel: "OpenGPT-4o",
    
    // === 生成参数 ===
    max_tokens: 6000,
    temperature: 0.8,
    top_p: 0.9,
    presence_penalty: 0.6,
    frequency_penalty: 0.6,
    
    // === 触发配置 ===
    triggerPrefix: "",           // 触发前缀（空字符串表示只能@触发）
    defaultPersona: "assistant",  // 默认人设
    
    // === 白名单配置 ===
    whitelist: {
      groups: [],  // 普通白名单群（@触发或前缀触发）
      users: []    // 私聊白名单用户
    },
    
    // === 全局AI配置 ===
    globalWhitelist: [],      // 全局AI白名单群（自动参与聊天）
    globalAIChance: 0.05,     // 全局AI触发概率（0-1）
    globalAICooldown: 300,    // 全局AI冷却时间（秒）
    
    // === 语义检索配置（Embedding）===
    embedding: {
      // --- 基础配置 ---
      enabled: true,                    // 是否启用语义检索
      provider: "lightweight",           // 提供商：lightweight | onnx | hf | fasttext | api
      maxContexts: 5,                    // 最大检索上下文数量
      similarityThreshold: 0.6,          // 相似度阈值（0-1）
      cacheExpiry: 86400,                // 缓存过期时间（秒）
      autoInit: true,                    // 是否自动初始化
      cachePath: "./data/models",        // 模型缓存路径
      
      onnxModel: "Xenova/all-MiniLM-L6-v2",
      onnxQuantized: true,
      
      hfToken: null,
      hfModel: "sentence-transformers/all-MiniLM-L6-v2",
      
      fasttextModel: "cc.zh.300.bin",
      
      apiUrl: "https://api.openai.com/v1/embeddings",
      apiKey: null,
      apiModel: "text-embedding-3-small"
    }
  },
  
  // ========== 戳一戳配置 ==========
  poke: {
    enabled: true,
    priority: -5000,
    
    modules: {
      basic: true,
      mood: true,
      intimacy: true,
      achievement: true,
      special: true,
      punishment: true,
      pokeback: true,
      image: true,
      voice: true,
      master: true
    },
    
    pokeback_enabled: true,
    image_chance: 0.3,
    voice_chance: 0.2,
    master_image: true,
    master_punishment: true,
    
    cooldowns: {
      interaction: 30000,
      special_effect: 180000,
      punishment: 60000
    },
    
    chances: {
      mood_change: 0.2,
      special_trigger: 0.15,
      punishment: 0.3
    }
  }
};

// ========== 配置合并函数 ==========
function mergeConfigs(defaultConfig, userConfig) {
  const result = {};
  
  for (const key in defaultConfig) {
    if (!defaultConfig.hasOwnProperty(key)) continue;
    
    const defaultValue = defaultConfig[key];
    const userValue = userConfig[key];
    
    // 如果是对象且不是数组，递归合并
    if (typeof defaultValue === 'object' && !Array.isArray(defaultValue) && defaultValue !== null) {
      if (userValue && typeof userValue === 'object' && !Array.isArray(userValue)) {
        result[key] = mergeConfigs(defaultValue, userValue);
      } else {
        result[key] = defaultValue;
      }
    } else {
      // 基础类型或数组
      if (userConfig.hasOwnProperty(key)) {
        // 检查类型是否匹配
        if (typeof userValue === typeof defaultValue || defaultValue === null) {
          result[key] = userValue;
        } else {
          console.warn(chalk.yellow(`[Config] ${key} 类型错误，应为 ${typeof defaultValue}，使用默认值`));
          result[key] = defaultValue;
        }
      } else {
        result[key] = defaultValue;
      }
    }
  }
  
  return result;
}

// ========== 创建配置目录 ==========
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
  console.log(chalk.green('[Config] 已创建配置目录'));
}

// ========== 读取或初始化配置 ==========
let userConfig = {};
let isFirstRun = false;

if (fs.existsSync(configFile)) {
  try {
    const content = fs.readFileSync(configFile, 'utf-8');
    userConfig = yaml.parse(content);
    
    if (!userConfig || typeof userConfig !== 'object') {
      console.warn(chalk.yellow('[Config] 配置文件格式错误，使用默认配置'));
      userConfig = {};
    }
  } catch (err) {
    console.error(chalk.red('[Config] 解析配置文件出错:'), err);
    userConfig = {};
  }
} else {
  console.log(chalk.green('[Config] 首次运行，创建默认配置文件'));
  isFirstRun = true;
  userConfig = {};
}

// ========== 合并配置 ==========
const finalConfig = mergeConfigs(defaultConfig, userConfig);

// ========== 写入配置文件 ==========
try {
  fs.writeFileSync(
    configFile,
    yaml.stringify(finalConfig, { indent: 2 }),
    'utf-8'
  );
  
  if (isFirstRun) {
    console.log(chalk.green('[Config] 配置文件已创建: data/xrkconfig/config.yaml'));
    console.log(chalk.yellow('[Config] 请修改配置文件中的 AI API 密钥'));
  }
} catch (err) {
  console.error(chalk.red('[Config] 写入配置文件出错:'), err);
}

// ========== 清理凭证文件 ==========
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

// ========== 配置验证与提示 ==========
function validateConfig() {
  const issues = [];
  
  // 检查AI配置
  if (finalConfig.ai?.apiKey === 'YOUR_AI_API_KEY_HERE') {
    issues.push('AI API密钥未配置');
  }
  
  if (finalConfig.ai?.embedding?.enabled) {
    const provider = finalConfig.ai.embedding.provider;
    
    switch (provider) {
      case 'onnx':
        issues.push('Embedding使用ONNX模式，请确保已安装: pnpm add onnxruntime-node -w');
        break;
      case 'hf':
        if (!finalConfig.ai.embedding.hfToken) {
          issues.push('Embedding使用HF模式，但未配置Token: https://huggingface.co/settings/tokens');
        }
        break;
      case 'fasttext':
        issues.push('Embedding使用FastText模式，请确保已安装: pnpm add fasttext.js -w');
        break;
      case 'api':
        if (!finalConfig.ai.embedding.apiKey) {
          issues.push('Embedding使用API模式，但未配置API密钥');
        }
        break;
      case 'lightweight':
        // 无需额外配置
        break;
      default:
        issues.push(`未知的Embedding提供商: ${provider}`);
    }
  }
  
  // 输出提示
  if (issues.length > 0) {
    console.log(chalk.yellow('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow('【配置提示】'));
    issues.forEach((issue, index) => {
      console.log(chalk.yellow(`${index + 1}. ${issue}`));
    });
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  }
}

validateConfig();

// ========== 初始化日志 ==========
logger.info(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
logger.info(chalk.yellow('【向日葵插件初始化】'));
logger.info(chalk.cyan('现在只为葵崽服务了呢~'));
logger.info(chalk.magenta('发送 向日葵帮助 解锁功能'));
logger.info(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

// 显示配置摘要
if (finalConfig.ai?.embedding?.enabled) {
  logger.info(chalk.green(`✅ 语义检索已启用: ${finalConfig.ai.embedding.provider}`));
}

if (finalConfig.ai?.globalWhitelist?.length > 0) {
  logger.info(chalk.green(`✅ 全局AI群: ${finalConfig.ai.globalWhitelist.length} 个`));
}

// ========== 加载插件 ==========
const files = fs
  .readdirSync('./plugins/XRK/apps')
  .filter((file) => file.endsWith('.js'));

let ret = [];
files.forEach((file) => {
  ret.push(import(`./apps/${file}`));
});

ret = await Promise.allSettled(ret);

let apps = {};
for (let i in files) {
  let name = files[i].replace('.js', '');
  
  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`);
    logger.error(ret[i].reason);
    continue;
  }
  
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]];
}

logger.info(chalk.green(`✅ 成功加载 ${Object.keys(apps).length} 个插件`));
logger.info(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

// ========== 导出配置和应用 ==========
export { apps, finalConfig as config };