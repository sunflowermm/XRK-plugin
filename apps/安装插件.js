import fs from 'fs'
import path from 'path'
import {
  pluginData,
  PLUGIN_CATEGORIES,
  getCategoryByInput,
  ensureCategoryImageSegments,
  getCategoryPlugins,
  createHtmlTemplate,
  saveAndScreenshot,
  formatPluginItemHtml,
  downloadWithProxy,
  getGitCloneUrlWithProxy,
  switchPluginProxy,
  updatePluginRemote,
  execCommand,
  generateTextPluginInfo
} from './plugintool.js'
import BotUtil from '../../../lib/util.js'
import { restart } from '../components/restart.js'

let isInstalling = false;

export class InstallPlugin extends plugin {
  constructor() {
    super({
      name: '插件安装器(安装相关)',
      dsc: '安装和管理插件',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^#安装插件列表(.*)$', fnc: 'sendPluginList' },
        { reg: '^#文字版安装插件列表(.*)$', fnc: 'sendPluginListText' },
        { reg: '^#插件查询(.*)$', fnc: 'searchPlugin' },
        { reg: '^#文字版插件查询(.*)$', fnc: 'searchPluginText' },
        { reg: '^#安装插件(.*)$', fnc: 'installPlugin' },
        { reg: '^#切换代理\\s*(.*?)$', fnc: 'switchProxy' },
        { reg: '^#打依赖\\s*(.*?)$', fnc: 'installDependencies' }
      ],
    });
  }

  async sendPluginList(e) {
    const categoryName = e.msg.match(this.rule[0].reg)[1]?.trim();

    if (categoryName) {
      const category = getCategoryByInput(categoryName);
      if (!category) {
        await e.reply(`未找到分类：${categoryName}`);
        return;
      }
      const key = category.name;
      const segments = await ensureCategoryImageSegments(key);
      if (!segments?.length) {
        await e.reply(`未找到分类：${categoryName}`);
        return;
      }
      await BotUtil.makeChatRecord(e, segments, key);
      return;
    }

    for (const c of PLUGIN_CATEGORIES) {
      const segments = await ensureCategoryImageSegments(c.name);
      if (segments?.length) await BotUtil.makeChatRecord(e, segments, c.name);
    }
  }

  async sendPluginListText(e) {
    const categoryName = e.msg.match(/^#文字版安装插件列表(.*)$/)[1]?.trim();
    if (categoryName) {
      const category = getCategoryByInput(categoryName);
      if (!category) {
        await e.reply(`未找到分类：${categoryName}`);
        return;
      }
      const key = category.name;
      const plugins = getCategoryPlugins(key);
      if (!plugins?.length) {
        await e.reply(`未找到分类：${categoryName}`);
        return;
      }
      const messages = plugins.map(p => generateTextPluginInfo(p));
      await BotUtil.makeChatRecord(e, messages, key);
      return;
    }
    for (const c of PLUGIN_CATEGORIES) {
      const plugins = getCategoryPlugins(c.name);
      if (plugins?.length) {
        const messages = plugins.map(p => generateTextPluginInfo(p));
        await BotUtil.makeChatRecord(e, messages, c.name);
      }
    }
  }

  async searchPlugin(e) {
    const searchText = e.msg.match(this.rule[2].reg)[1]?.trim();
    if (!searchText) {
      await e.reply('请输入要查询的插件名称');
      return;
    }

    const pluginInfos = this.searchPluginsByText(searchText);
    if (pluginInfos.length === 0) {
      await e.reply(`未找到包含关键词 "${searchText}" 的插件信息`);
      return;
    }

    const content = pluginInfos.map(info => formatPluginItemHtml(info)).join('');
    const htmlContent = createHtmlTemplate('插件查询结果', content);
    const screenshotPath = await saveAndScreenshot(htmlContent, 'search_result');
    if (!screenshotPath) {
      await e.reply('截图生成失败，请稍后重试');
      return;
    }
    await e.reply(segment.image(screenshotPath));
  }

  async searchPluginText(e) {
    const searchText = e.msg.match(/^#文字版插件查询(.*)$/)[1]?.trim();
    if (!searchText) {
      await e.reply('请输入要查询的插件名称');
      return;
    }

    const pluginInfos = this.searchPluginsByText(searchText);
    if (pluginInfos.length === 0) {
      await e.reply(`未找到包含关键词 "${searchText}" 的插件信息`);
      return;
    }

    const messages = pluginInfos.map(plugin => generateTextPluginInfo(plugin));
    await BotUtil.makeChatRecord(e, messages, `查询结果：${searchText}`);
  }

  async installPlugin(e) {
    if (!e.isMaster) {
      await e.reply('❌ 只有主人才能安装插件哦！');
      return;
    }

    if (isInstalling) {
      await e.reply('⚠️ 正在安装插件，请等待完成后再试');
      return;
    }

    const pluginNamesStr = e.msg.match(this.rule[4].reg)[1]?.trim();
    if (!pluginNamesStr) {
      await e.reply('⚠️ 请指定要安装的插件名称');
      return;
    }

    const pluginNames = pluginNamesStr.split(/\s+/);
    isInstalling = true;
    logger.info(`[插件安装器] 开始安装插件：${pluginNames.join(', ')}`);

    const results = { installed: [], jsInstalled: [], failed: [] };
    await e.reply('📦 开始安装插件...');

    for (const name of pluginNames) {
      const pluginInfo = this.findPluginInfo(name);
      if (!pluginInfo) {
        await e.reply(`❌ 未找到插件：${name}`);
        continue;
      }

      const isJsPlugin = pluginInfo.git?.endsWith('.js');
      const pluginDirPath = path.join(process.cwd(), 'plugins', isJsPlugin ? 'example' : '', pluginInfo.name);

      if (fs.existsSync(pluginDirPath)) {
        await e.reply(`ℹ️ 插件 ${pluginInfo.cn_name} 已安装，跳过`);
        continue;
      }

      await e.reply(`⏳ 正在安装${isJsPlugin ? ' JS ' : ' '}插件：${pluginInfo.cn_name}\n🔗 源地址：${pluginInfo.git}`);
      try {
        if (isJsPlugin) {
          const jsContent = await downloadWithProxy(pluginInfo.git);
          fs.writeFileSync(pluginDirPath, jsContent);
          results.jsInstalled.push(pluginInfo.cn_name);
          await e.reply(`✅ JS插件 ${pluginInfo.cn_name} 安装成功！`);
        } else {
          const cloneUrl = await getGitCloneUrlWithProxy(pluginInfo.git);
          await execCommand(`git clone --depth=1 ${cloneUrl} ${pluginDirPath}`);
          await execCommand(`pnpm install --filter ${pluginInfo.name}`);
          results.installed.push(pluginInfo.cn_name);
          await e.reply(`✅ 插件 ${pluginInfo.cn_name} 及其依赖安装成功！`);
        }
      } catch (error) {
        results.failed.push(pluginInfo.cn_name);
        if (fs.existsSync(pluginDirPath)) {
          await execCommand(`rm -rf ${pluginDirPath}`);
        }
        await e.reply(`❌ 插件 ${pluginInfo.cn_name} 安装失败：${error.message}`);
      }
    }

    isInstalling = false;
    await this.sendInstallReport(e, results);

    if (results.installed.length > 0) {
      await e.reply('🔄 所有依赖安装完成，即将重启机器人...');
      await restart(e, results.installed);
    } else if (results.jsInstalled.length > 0) {
      await e.reply('✅ JS插件安装完成，无需重启');
    }
  }

  async switchProxy(e) {
    if (!e.isMaster) {
      await e.reply('❌ 只有主人才能切换插件代理哦！');
      return;
    }

    const pluginName = e.msg.match(/^#切换代理\s*(.*?)$/)[1]?.trim();
    if (!pluginName) {
      await e.reply('⚠️ 请指定要切换代理的插件名称');
      return;
    }

    const pluginInfo = pluginData[pluginName] || { name: pluginName };
    const pluginDirPath = path.join(process.cwd(), 'plugins', pluginInfo.name);
    if (!fs.existsSync(pluginDirPath)) {
      await e.reply(`❌ 插件 ${pluginInfo.cn_name || pluginInfo.name} 未安装`);
      return;
    }

    const originalUrl = await this.getOriginalRemote(pluginDirPath) || pluginInfo.git;
    await e.reply(`⏳ 正在为插件 ${pluginInfo.cn_name || pluginInfo.name} 切换代理...\n📍 当前地址：${originalUrl}`);
    const newRemote = await switchPluginProxy(pluginInfo.name, originalUrl);
    await updatePluginRemote(pluginDirPath, newRemote);
    await e.reply(`✅ 代理切换成功！\n新地址：${newRemote}`);
  }

  async installDependencies(e) {
    if (!e.isMaster) {
      await e.reply('只有主人才能执行依赖安装哦！');
      return;
    }

    const dependencyStr = e.msg.match(/^#打依赖\s*(.*?)$/)[1]?.trim();
    await e.reply(`⏳ 正在安装${dependencyStr ? `依赖 ${dependencyStr}` : '项目依赖'}...`);
    await execCommand(dependencyStr ? `pnpm add ${dependencyStr} -w` : 'pnpm install');
    await e.reply('✅ 依赖安装完成！');
  }

  searchPluginsByText(searchText) {
    const pluginInfos = [];
    const addedPlugins = new Set();
    for (const name in pluginData) {
      const info = pluginData[name];
      const fields = [info.name, info.cn_name, info.description, info.git, info.url, info.anothername].filter(Boolean);
      if (fields.some(field => field.includes(searchText)) && !addedPlugins.has(info.name)) {
        pluginInfos.push(info);
        addedPlugins.add(info.name);
      }
    }
    return pluginInfos;
  }

  findPluginInfo(name) {
    return pluginData[name] || pluginData[name.toLowerCase()] || pluginData[name.replace(/\s+/g, '')];
  }

  async sendInstallReport(e, results) {
    let report = '📊 安装任务已完成！';
    if (results.installed.length) report += `\n✅ 成功安装插件：\n  - ${results.installed.join('\n  - ')}`;
    if (results.jsInstalled.length) report += `\n✅ 成功安装JS插件：\n  - ${results.jsInstalled.join('\n  - ')}`;
    if (results.failed.length) report += `\n❌ 安装失败插件：\n  - ${results.failed.join('\n  - ')}`;
    await e.reply(report);
  }

  async getOriginalRemote(pluginDirPath) {
    const { stdout } = await execCommand('git remote get-url origin', { cwd: pluginDirPath });
    return stdout.trim();
  }
}