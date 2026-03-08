import fs from 'fs';
import path from 'path';
import plugin from '../../../lib/plugins/plugin.js';
import {
  getInstalledPlugins,
  resolveMultiplePluginIdentifiers,
  execCommand,
  pluginData,
  createHtmlTemplate,
  saveAndScreenshot,
  ensurePluginDataLoaded
} from './plugintool.js';
import BotUtil from '../../../lib/util.js';
export class ManagePlugin extends plugin {
  constructor() {
    super({
      name: '插件管理器(管理相关)',
      dsc: '管理已安装的插件（列表、删除、停用、启用）',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^#?(已安装插件列表|查插件)$', fnc: 'listInstalledPlugins' },
        { reg: '^#?文字版(已安装插件列表|查插件)$', fnc: 'listInstalledPluginsText' },
        { reg: '^#?(删除|删|卸载)插件\\s*(.+)$', fnc: 'deletePlugin' },
        { reg: '^#?确认(删除|删|卸载)插件\\s*(.+)$', fnc: 'confirmDeletePlugin' },
        { reg: '^#?(停用|禁用)插件\\s*(.+)$', fnc: 'disablePlugin' },
        { reg: '^#?(启用|开启)插件\\s*(.+)$', fnc: 'enablePlugin' }
      ],
    });
  }

  async listInstalledPlugins(e) {
    if (!e.isMaster) return;
    ensurePluginDataLoaded();
    const { pluginList } = getInstalledPlugins();
    await e.reply([
      `共 ${pluginList.length} 个插件\n`,
      '支持的管理指令：\n#删除插件 [序号/名称/别名]\n#停用插件 [序号/名称/别名]\n#启用插件 [序号/名称/别名]\n',
      '请稍等插件列表截图流程'
    ]);

    const packagePlugins = pluginList.filter(p => p.type === 'package');
    const jsPlugins = pluginList.filter(p => p.type === 'js');
    await this.generateAndSendPluginImages(e, packagePlugins, '插件包', 'package');
    await this.generateAndSendPluginImages(e, jsPlugins, 'JS插件', 'js');
  }

  async listInstalledPluginsText(e) {
    if (!e.isMaster) return;
    ensurePluginDataLoaded();
    const { pluginList } = getInstalledPlugins();
    const messages = [
      `共 ${pluginList.length} 个插件`,
      '支持的指令\n#删除插件 [序号/名称/别名]\n#停用插件 [序号/名称/别名]\n#启用插件 [序号/名称/别名]'
    ];

    const packagePlugins = pluginList.filter(p => p.type === 'package');
    if (packagePlugins.length) {
      messages.push('🌻=== 插件包 ===🌻');
      packagePlugins.forEach(p => {
        const pluginInfo = this.getPluginInfo(p.name);
        const aliases = pluginInfo ? `(${pluginInfo.anothername || ''})` : '';
        messages.push(`${p.index}. [${p.status}] ${p.name} ${aliases}`);
      });
    }

    const jsPlugins = pluginList.filter(p => p.type === 'js');
    if (jsPlugins.length) {
      messages.push('🌻=== JS插件 ===🌻');
      jsPlugins.forEach(p => {
        const pluginInfo = this.getPluginInfo(p.name);
        const aliases = pluginInfo ? `(${pluginInfo.anothername || ''})` : '';
        messages.push(`${p.index}. [${p.status}] ${p.displayName} ${aliases}`);
      });
    }

    await BotUtil.makeChatRecord(e, messages, '🌻已安装插件列表🌻');
  }

  async deletePlugin(e) {
    if (!e.isMaster) return;
    ensurePluginDataLoaded();
    const inputStr = e.msg.match(/^#?(?:删除|删|卸载)插件\s*(.+)$/)[1]?.trim();
    if (!inputStr) {
      await e.reply('请指定要删除的插件，例如：#删除插件 1 2');
      return;
    }

    const tokens = inputStr.split(/\s+/);
    const { pluginMap } = getInstalledPlugins();
    const plugins = this.resolvePlugins(tokens, pluginMap);
    const toConfirm = [];
    const jsDeleted = [];
    const notFound = [];

    for (const plugin of plugins) {
      if (plugin.error) {
        notFound.push(plugin.token);
        continue;
      }

      const pluginDirPath = path.join(process.cwd(), 'plugins', plugin.type === 'js' ? 'example' : '', plugin.name);
      if (!fs.existsSync(pluginDirPath)) {
        notFound.push(plugin.name);
        continue;
      }

      if (plugin.type === 'js') {
        await execCommand(`rm -rf ${pluginDirPath}`);
        jsDeleted.push(plugin.displayName || plugin.name);
      } else {
        toConfirm.push(plugin.name);
      }
    }

    if (toConfirm.length) await e.reply(`以下插件包需确认删除：\n${toConfirm.join('\n')}\n请发送：#确认删除插件 [名称/序号/别名]`);
    if (jsDeleted.length) await e.reply(`已删除JS插件：${jsDeleted.join('、')}\n无需重启`);
    if (notFound.length) await e.reply(`未找到插件：${notFound.join('、')}`);
  }

  async confirmDeletePlugin(e) {
    if (!e.isMaster) return;
    ensurePluginDataLoaded();
    const inputStr = e.msg.match(/^#?确认(?:删除|删|卸载)插件\s*(.+)$/)[1]?.trim();
    if (!inputStr) {
      await e.reply('请指定要确认删除的插件，例如：#确认删除插件 1 2');
      return;
    }

    const tokens = inputStr.split(/\s+/);
    const { pluginMap } = getInstalledPlugins();
    const plugins = this.resolvePlugins(tokens, pluginMap);
    const deleted = [];
    const notFound = [];

    for (const plugin of plugins) {
      if (plugin.error || plugin.type !== 'package') {
        notFound.push(plugin.token || plugin.name);
        continue;
      }

      const pluginDirPath = path.join(process.cwd(), 'plugins', plugin.name);
      if (fs.existsSync(pluginDirPath)) {
        await execCommand(`rm -rf ${pluginDirPath}`);
        deleted.push(plugin.name);
      } else {
        notFound.push(plugin.name);
      }
    }

    if (deleted.length) await e.reply(`已删除插件包：${deleted.join('、')}\n请重启Bot生效`);
    if (notFound.length) await e.reply(`未找到插件包：${notFound.join('、')}`);
  }

  async disablePlugin(e) {
    if (!e.isMaster) return;
    ensurePluginDataLoaded();
    const inputStr = e.msg.match(/^#?(?:停用|禁用)插件\s*(.+)$/)[1]?.trim();
    if (!inputStr) {
      await e.reply('请指定要停用的插件，例如：#停用插件 1 2');
      return;
    }

    const tokens = inputStr.split(/\s+/);
    const { pluginMap } = getInstalledPlugins();
    const plugins = this.resolvePlugins(tokens, pluginMap);
    const disabledJs = [];
    const disabledPackage = [];
    const notFound = [];

    for (const plugin of plugins) {
      if (plugin.error) {
        notFound.push(plugin.token);
        continue;
      }

      const pluginDirPath = path.join(process.cwd(), 'plugins', plugin.type === 'js' ? 'example' : '', plugin.name);
      if (!fs.existsSync(pluginDirPath)) {
        notFound.push(plugin.name);
        continue;
      }

      if (plugin.type === 'js' && !pluginDirPath.endsWith('.disable')) {
        fs.renameSync(pluginDirPath, `${pluginDirPath}.disable`);
        disabledJs.push(plugin.displayName || plugin.name);
      } else if (plugin.type === 'package') {
        const jsFiles = fs.readdirSync(pluginDirPath).filter(f => f.endsWith('.js'));
        jsFiles.forEach(f => fs.renameSync(path.join(pluginDirPath, f), path.join(pluginDirPath, `${f}.disable`)));
        disabledPackage.push(plugin.name);
      }
    }

    if (disabledJs.length) await e.reply(`已停用JS插件：${disabledJs.join('、')}\n无需重启`);
    if (disabledPackage.length) await e.reply(`已停用插件包：${disabledPackage.join('、')}\n请重启Bot生效`);
    if (notFound.length) await e.reply(`未找到插件：${notFound.join('、')}`);
  }

  async enablePlugin(e) {
    if (!e.isMaster) return;
    ensurePluginDataLoaded();
    const inputStr = e.msg.match(/^#?(?:启用|开启)插件\s*(.+)$/)[1]?.trim();
    if (!inputStr) {
      await e.reply('请指定要启用的插件，例如：#启用插件 1 2');
      return;
    }

    const tokens = inputStr.split(/\s+/);
    const { pluginMap } = getInstalledPlugins();
    const plugins = this.resolvePlugins(tokens, pluginMap);
    const enabledJs = [];
    const enabledPackage = [];
    const notFound = [];

    for (const plugin of plugins) {
      if (plugin.error) {
        notFound.push(plugin.token);
        continue;
      }

      const pluginDirPath = path.join(process.cwd(), 'plugins', plugin.type === 'js' ? 'example' : '', plugin.name);
      const disablePath = `${pluginDirPath}.disable`;
      
      if (plugin.type === 'js' && fs.existsSync(disablePath)) {
        fs.renameSync(disablePath, pluginDirPath);
        enabledJs.push(plugin.displayName || plugin.name);
      } else if (plugin.type === 'package' && fs.existsSync(pluginDirPath)) {
        const disabledFiles = fs.readdirSync(pluginDirPath).filter(f => f.endsWith('.js.disable'));
        disabledFiles.forEach(f => fs.renameSync(path.join(pluginDirPath, f), path.join(pluginDirPath, f.replace('.disable', ''))));
        enabledPackage.push(plugin.name);
      } else {
        notFound.push(plugin.name);
      }
    }

    if (enabledJs.length) await e.reply(`已启用JS插件：${enabledJs.join('、')}\n无需重启`);
    if (enabledPackage.length) await e.reply(`已启用插件包：${enabledPackage.join('、')}\n请重启Bot生效`);
    if (notFound.length) await e.reply(`未找到插件：${notFound.join('、')}`);
  }

  async generateAndSendPluginImages(e, plugins, typeName, typePrefix) {
    const groups = [];
    for (let i = 0; i < plugins.length; i += 10) groups.push(plugins.slice(i, i + 10));

    const images = [];
    for (let [index, group] of groups.entries()) {
      const content = group.map(p => {
        const pluginInfo = this.getPluginInfo(p.name);
        const aliases = pluginInfo?.anothername ? `<p><strong>别名：</strong>${pluginInfo.anothername}</p>` : '';
        
        return `
          <div class="plugin-item">
            <h3>${p.index}. ${p.displayName || p.name}</h3>
            <p><strong>类型：</strong>${typeName}</p>
            <p><strong>状态：</strong>${p.status}</p>
            ${aliases}
            ${p.repoUrl ? `<p><strong>仓库地址：</strong>${p.repoUrl}</p>` : ''}
          </div>
        `;
      }).join('');

      const htmlContent = createHtmlTemplate(`${typeName}列表 - 第 ${index + 1} 组`, content);
      const screenshotPath = await saveAndScreenshot(htmlContent, `installed_${typePrefix}_group_${index + 1}`);
      if (screenshotPath) images.push(segment.image(screenshotPath));
    }

    if (images.length) await BotUtil.makeChatRecord(e, images, `🌻已安装${typeName}列表🌻`);
  }

  getPluginInfo(name) {
    const byKey = pluginData[name];
    if (byKey) return byKey;
    const splitAlias = (s) => (s || '').split(/\s*\|\s*|\s+/).filter(Boolean);
    return Object.values(pluginData).find(p =>
      p.name === name ||
      p.cn_name === name ||
      (p.anothername && splitAlias(p.anothername).some(alias => alias.toLowerCase() === (name || '').toLowerCase()))
    );
  }

  resolvePlugins(tokens, pluginMap) {
    const plugins = resolveMultiplePluginIdentifiers(tokens, pluginMap);
    for (let i = 0; i < plugins.length; i++) {
      if (plugins[i].error) {
        const token = plugins[i].token;
        const pluginByAlias = this.findPluginByAlias(token);
        if (pluginByAlias && pluginMap[pluginByAlias.name]) {
          plugins[i] = { ...pluginMap[pluginByAlias.name] };
          continue;
        }
        const jsFiles = fs.readdirSync(path.join(process.cwd(), 'plugins/example')).filter(f => 
          f.endsWith('.js') || f.endsWith('.js.disable')
        );
        
        const matchedFile = jsFiles.find(file => {
          const baseName = file.replace('.disable', '');
          return baseName === token || baseName === `${token}.js`;
        });
        
        if (matchedFile) {
          const fileName = matchedFile.replace('.disable', '');
          const jsPlugin = Object.values(pluginMap).find(p => 
            p.type === 'js' && (p.name === fileName || p.displayName === fileName)
          );
          
          if (jsPlugin) {
            plugins[i] = { ...jsPlugin };
          }
        }
      }
    }
    
    return plugins;
  }

  findPluginByAlias(alias) {
    const splitAlias = (s) => (s || '').split(/\s*\|\s*|\s+/).filter(Boolean);
    return Object.values(pluginData).find(p =>
      p.anothername && splitAlias(p.anothername).some(name =>
        name.toLowerCase() === (alias || '').toLowerCase()
      )
    );
  }
}