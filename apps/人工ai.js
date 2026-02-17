import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import xrkconfig from '../components/xrkconfig.js';

const _path = process.cwd();
const aiJsonPath = path.join(_path, 'plugins/XRK-plugin/config/ai.json');

/**
 * 加载或创建 AI 配置文件
 * @returns {Object} AI 配置数据
 */
function loadAiConfig() {
  try {
    // 检查文件是否存在
    if (fs.existsSync(aiJsonPath)) {
      const content = fs.readFileSync(aiJsonPath, 'utf8');
      return JSON.parse(content);
    }
    
    // 文件不存在，创建默认配置
    const defaultConfig = {
      "你好": ["你好呀！", "你好～", "你好喵～"],
      "再见": ["再见～", "拜拜～", "下次见～"]
    };
    
    // 确保目录存在
    const configDir = path.dirname(aiJsonPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // 写入默认配置
    fs.writeFileSync(aiJsonPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    logger.info('[人工AI] 配置文件不存在，已创建默认配置');
    return defaultConfig;
  } catch (error) {
    logger.error('[人工AI] 配置文件加载失败:', error);
    // 返回空配置，避免插件崩溃
    return {};
  }
}

const aiData = loadAiConfig();

export class ExamplePlugin extends plugin {
  constructor() {
    super({
      name: 'ai',
      dsc: '简单开发示例',
      event: 'message',
      priority: -10000,
      rule: [
        { reg: '.*', fnc: 'aiHandler', log: false },
        { reg: '^#开启向日葵ai$', fnc: 'activateAi' },
        { reg: '^#关闭向日葵ai$', fnc: 'deactivateAi' }
      ]
    });
  }

  async handleResponse(e) {
    const userMessage = e.msg;
    const responseKey = this.findMatch(userMessage, aiData);
    if (responseKey && aiData[responseKey]) {
      const responses = aiData[responseKey];
      const reply = responses[Math.floor(Math.random() * responses.length)];
      await e.reply(reply, true);
    }
  }

  findMatch(msg, json) {
    if (!msg) return null;
    return Object.keys(json).find(key => key === msg) || null;
  }

  async activateAi(e) {
    if (!e.isMaster) return;
    xrkconfig.set('peopleai', true);
    await e.reply('向日葵词库AI已开启');
  }

  async deactivateAi(e) {
    if (!e.isMaster) return;
    xrkconfig.set('peopleai', false);
    await e.reply('向日葵词库AI已关闭');
  }

  async aiHandler(e) {
    if (!xrkconfig.peopleai) return false;
    if (e.img) return false;
    await this.handleResponse(e);
    return false;
  }
}
