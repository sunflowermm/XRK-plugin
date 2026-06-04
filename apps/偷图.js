import fetch from "node-fetch";
import plugin from "../../../lib/plugins/plugin.js";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import { v4 as uuidv4 } from "uuid";
import hub from "../lib/xrk-hub.js";

const _path = process.cwd();
const baseConfig = {
  savePathBase: path.resolve(_path, "plugins/XRK-plugin/resources/emoji"),
  defaultDirectory: "孤独摇滚",
  batchSize: 20,
  uuidFormat: /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
};
let imageList = [];

class FileManager {
  static loadConfig() {
    return hub.emoji_filename || baseConfig.defaultDirectory;
  }

  static saveConfig(directoryName) {
    try {
      hub.set('emoji_filename', directoryName);
      return true;
    } catch (error) {
      console.error("保存配置时出错:", error);
      return false;
    }
  }

  static getCurrentSavePath() {
    return path.join(baseConfig.savePathBase, this.loadConfig());
  }

  static getFiles(dirPath) {
    if (!fs.existsSync(dirPath)) return [];

    try {
      return fs
        .readdirSync(dirPath)
        .filter((file) => /\.(jpg|png|gif|jpeg|webp)$/i.test(file));
    } catch (error) {
      console.error(`读取目录出错 ${dirPath}:`, error);
      return [];
    }
  }

  static async downloadImage(url, savePath) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`图片下载失败: ${response.status} ${response.statusText}`);
      }
      await promisify(pipeline)(response.body, fs.createWriteStream(savePath));
      return true;
    } catch (error) {
      console.error("下载图片出错:", error);
      throw error;
    }
  }

  static async getImageExtension(url) {
    try {
      const urlPath = new URL(url).pathname;
      const urlExtension = path.extname(urlPath).toLowerCase();
      if (urlExtension && /\.(jpg|jpeg|png|gif|webp)$/i.test(urlExtension)) {
        return urlExtension.substring(1);
      }

      const headResponse = await fetch(url, { method: "HEAD" });
      const contentType = headResponse.headers.get("content-type") || "";
      const mimeMap = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
      };
      return mimeMap[contentType] || "jpg";
    } catch (error) {
      console.error("获取图片扩展名失败:", error);
      return "jpg";
    }
  }

  static getIdentifierFromFileName(fileName) {
    const baseName = fileName.split(".")[0];
    if (/^[0-9a-f]{8}$/i.test(baseName)) {
      return { id: baseName, isUuid: true };
    }
    else if (baseConfig.uuidFormat.test(baseName)) {
      return { id: baseName, isUuid: true };
    }
    else {
      return { id: baseName, isUuid: false };
    }
  }

  static generateNewUuid() {
    return uuidv4().slice(0, 8);
  }
  
  static findFilesByIdentifier(dirPath, identifier) {
    const files = this.getFiles(dirPath);
    return files.filter(file => file.startsWith(identifier + "."));
  }
}

/**
 * 获取随机表情符号
 */
function getRandomEmoji() {
  const emojis = ["🖼️", "📸", "🌆", "🎨", "📷", "🏞️", "🌃", "🌅", "🌄", "📱"];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * 格式化图片展示消息，包含标识符和序号
 */
function formatImageMessage(index, total, identifier, groupInfo = "", serialNumber) {
  const emoji = getRandomEmoji();
  const progressBar = createProgressBar(index, total);
  const idType = identifier.isUuid ? "UUID" : "自定义ID";
  return `${emoji} 图片 ${serialNumber}: ${index}/${total} ${groupInfo}\n${idType}: ${identifier.id}\n${progressBar}`;
}

/**
 * 创建进度条
 */
function createProgressBar(current, total, length = 10) {
  const progress = Math.floor((current / total) * length);
  const filled = "█".repeat(progress);
  const empty = "░".repeat(length - progress);
  return `${filled}${empty} ${Math.round((current / total) * 100)}%`;
}

/**
 * 创建合并转发消息
 */
async function createForwardMessage(e, messages, title = "图片集合") {
  try {
    const decoratedMessages = [
      { message: `┏━━━━━━━━━━━━━┓`, nickname: Bot.nickname, user_id: Bot.uin },
      ...messages,
      { message: `┗━━━━━━━━━━━━━┛`, nickname: Bot.nickname, user_id: Bot.uin },
    ];
    return e.isGroup
      ? await e.group.makeForwardMsg(decoratedMessages)
      : await e.friend.makeForwardMsg(decoratedMessages);
  } catch (error) {
    console.error("创建合并转发消息出错:", error);
    throw error;
  }
}

/**
 * 主插件类
 */
export class SimplePicCollect extends plugin {
  constructor() {
    super({
      name: "SimplePicCollect",
      dsc: "图片收藏与管理系统",
      event: "message",
      priority: 100,
      rule: [
        { reg: "^(收藏图片|偷图)(.*)$", fnc: "collectImage", permission: "master" },
        { reg: "^删除图片(.*)$", fnc: "deleteImage", permission: "master" },
        { reg: "^#查看全部图片(.*)$", fnc: "showAllImages", permission: "master" },
        { reg: "^#偷图设置目录(.*)$", fnc: "setDirectory", permission: "master" },
        { reg: "^#查看可用目录$", fnc: "showDirectories", permission: "master" },
      ],
    });
  }
  
  async setDirectory(e) {
    const dirName = e.msg.replace(/^#偷图设置目录/, "").trim();
    if (!dirName) return e.reply("请指定目录名称");

    try {
      const directories = fs.readdirSync(baseConfig.savePathBase).filter((file) =>
        fs.statSync(path.join(baseConfig.savePathBase, file)).isDirectory()
      );

      if (!directories.includes(dirName)) {
        // 创建新目录
        const newDirPath = path.join(baseConfig.savePathBase, dirName);
        if (!fs.existsSync(newDirPath)) {
          fs.mkdirSync(newDirPath, { recursive: true });
        }
        e.reply(`已创建新目录：${dirName}`);
      }

      return FileManager.saveConfig(dirName)
        ? e.reply(`已将存储目录设置为：${dirName}`)
        : e.reply("设置目录失败，请检查权限或配置文件");
    } catch (error) {
      console.error("设置目录时出错:", error);
      return e.reply(`设置目录时发生错误: ${error.message}`);
    }
  }

  async showDirectories(e) {
    try {
      const directories = fs.readdirSync(baseConfig.savePathBase).filter((file) =>
        fs.statSync(path.join(baseConfig.savePathBase, file)).isDirectory()
      );

      if (directories.length === 0) {
        return e.reply("当前没有可用目录，请使用 #偷图设置目录 创建目录");
      }

      const currentDir = FileManager.loadConfig();
      const dirList = directories
        .map((dir) => {
          const fileCount = FileManager.getFiles(
            path.join(baseConfig.savePathBase, dir)
          ).length;
          return `${dir === currentDir ? "🔹" : "🔸"} ${dir} (${fileCount}张图)`;
        })
        .join("\n");

      return e.reply(
        `📁 目录列表 (共${directories.length}个)\n${"─".repeat(20)}\n当前目录：${currentDir}\n${"─".repeat(20)}\n${dirList}`
      );
    } catch (error) {
      console.error("显示目录时出错:", error);
      return e.reply(`获取目录列表时发生错误: ${error.message}`);
    }
  }

  async collectImage(e) {
    let replyMsg;
    
    try {
      if (e.source) {
        if (e.getReply && typeof e.getReply === 'function') {
          // 如果有 getReply 方法，使用它
          replyMsg = await e.getReply();
        } else {
          // 否则使用传统方式获取
          try {
            replyMsg = e.isGroup
              ? (await e.group.getChatHistory(e.source.seq, 1))[0]
              : (await e.friend.getChatHistory(e.source.time, 1))[0];
          } catch {
            // 如果获取失败，说明没有权限或其他问题
            return e.reply("获取回复消息失败，请确保回复的是包含图片的消息");
          }
        }
      } else {
        return e.reply("请回复一条包含图片的消息");
      }
      
      if (!replyMsg) {
        return e.reply("未能获取到回复的消息，请重试");
      }
    } catch (error) {
      console.error("获取回复消息失败:", error);
      return e.reply("获取回复消息失败，请重试");
    }

    // 查找图片
    let imgSegment = null;
    
    // 检查 message 数组中的图片
    if (replyMsg.message && Array.isArray(replyMsg.message)) {
      imgSegment = replyMsg.message.find((item) => item.type === "image");
    }
    
    // 如果没找到，尝试从 raw_message 解析
    if (!imgSegment && replyMsg.raw_message) {
      const imageMatch = replyMsg.raw_message.match(/$$CQ:image,[^$$]*url=([^,\]]+)/);
      if (imageMatch) {
        // 解码 URL
        const url = imageMatch[1].replace(/&amp;/g, '&');
        imgSegment = { type: "image", url: url };
      }
    }
    
    if (!imgSegment) {
      return e.reply("未在回复中找到图片");
    }

    try {
      const currentSavePath = FileManager.getCurrentSavePath();
      
      // 确保目录存在
      if (!fs.existsSync(currentSavePath)) {
        fs.mkdirSync(currentSavePath, { recursive: true });
      }
      
      const fileExtension = await FileManager.getImageExtension(imgSegment.url);
      const uuid = FileManager.generateNewUuid();
      const fileName = `${uuid}.${fileExtension}`;
      const savePath = path.join(currentSavePath, fileName);

      const progressMsg = await e.reply(`正在保存图片中...\n${createProgressBar(50, 100)}`);
      await FileManager.downloadImage(imgSegment.url, savePath);

      // 尝试撤回进度消息
      if (e.isGroup && progressMsg?.message_id) {
        try {
          await e.group.recallMsg(progressMsg.message_id);
        } catch (recallError) {
          console.error("撤回消息失败:", recallError);
        }
      }

      const currentDir = FileManager.loadConfig();
      const files = FileManager.getFiles(currentSavePath);
      return e.reply(
        `✅ 图片保存成功！\n📂 目录: ${currentDir}\n📝 文件名: ${fileName}\n🔑 UUID: ${uuid}\n📊 当前目录共有 ${files.length} 张图片`
      );
    } catch (error) {
      console.error("收集图片时出错:", error);
      return e.reply(`❌ 保存失败：${error.message}`);
    }
  }

  async deleteImage(e) {
    const input = e.msg.replace("删除图片", "").trim();
    if (!input) return e.reply("请指定要删除的图片ID，多个ID用空格分隔");

    try {
      const currentSavePath = FileManager.getCurrentSavePath();
      if (!fs.existsSync(currentSavePath)) return e.reply("当前目录不存在");

      const files = FileManager.getFiles(currentSavePath);
      if (files.length === 0) return e.reply("当前目录没有图片");
      
      const toDelete = input.split(/\s+/).filter(item => item.trim());
      const deletedFiles = [];
      const notFound = [];

      for (const identifier of toDelete) {
        const matchingFiles = FileManager.findFilesByIdentifier(currentSavePath, identifier);
        
        if (matchingFiles.length > 0) {
          for (const file of matchingFiles) {
            fs.unlinkSync(path.join(currentSavePath, file));
            deletedFiles.push(file);
          }
        } else {
          notFound.push(identifier);
        }
      }

      const messages = [];
      if (deletedFiles.length > 0) {
        messages.push(`✅ 已删除 ${deletedFiles.length} 张图片: ${deletedFiles.join(", ")}`);
      }
      if (notFound.length > 0) {
        messages.push(`❓ 未找到以下ID的图片: ${notFound.join(", ")}`);
      }
      
      return e.reply(messages.join("\n") || "操作完成");
    } catch (error) {
      console.error("删除图片时出错:", error);
      return e.reply(`❌ 删除图片时发生错误: ${error.message}`);
    }
  }

  async showAllImages(e) {
    try {
      const currentSavePath = FileManager.getCurrentSavePath();
      if (!fs.existsSync(currentSavePath)) return e.reply("当前目录不存在");

      const files = FileManager.getFiles(currentSavePath);
      if (files.length === 0) return e.reply("当前目录没有图片");

      imageList = files;

      const currentDir = FileManager.loadConfig();
      const chunks = Array.from(
        { length: Math.ceil(files.length / baseConfig.batchSize) },
        (_, i) => files.slice(i * baseConfig.batchSize, (i + 1) * baseConfig.batchSize)
      );

      await e.reply(
        `📂 准备显示 ${currentDir} 目录下的 ${files.length} 张图片\n将分 ${chunks.length} 组发送，请稍候...\n\n删除图片时，请使用 删除图片 图片ID`
      );

      for (let i = 0; i < chunks.length; i++) {
        const groupInfo = `(组 ${i + 1}/${chunks.length})`;
        const messages = [
          { message: `📂 ${currentDir} 目录图片 ${groupInfo}`, nickname: Bot.nickname, user_id: Bot.uin },
        ];

        for (let j = 0; j < chunks[i].length; j++) {
          const file = chunks[i][j];
          const imagePath = path.join(currentSavePath, file);
          const identifier = FileManager.getIdentifierFromFileName(file);
          const serialNumber = i * baseConfig.batchSize + j + 1;

          if (fs.existsSync(imagePath)) {
            messages.push({
              message: [
                formatImageMessage(j + 1, chunks[i].length, identifier, groupInfo, serialNumber),
                segment.image(`file://${imagePath}`),
              ],
              nickname: Bot.nickname,
              user_id: Bot.uin,
            });
          }
        }

        try {
          const forwardMsg = await createForwardMessage(e, messages, `${currentDir} 目录 ${groupInfo}`);
          await e.reply(forwardMsg);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch (error) {
          console.error("发送图片组失败:", error);
          await e.reply("发送图片失败，尝试单独发送前5张...");
          const maxToSend = Math.min(5, chunks[i].length);
          for (let j = 0; j < maxToSend; j++) {
            const file = chunks[i][j];
            const imagePath = path.join(currentSavePath, file);
            const identifier = FileManager.getIdentifierFromFileName(file);
            const serialNumber = i * baseConfig.batchSize + j + 1;
            if (fs.existsSync(imagePath)) {
              await e.reply([
                segment.text(formatImageMessage(j + 1, chunks[i].length, identifier, groupInfo, serialNumber)),
                segment.image(`file://${imagePath}`),
              ]);
              await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
        }
      }

      if (chunks.length > 1)
        await e.reply(`✅ 全部 ${files.length} 张图片已发送完毕\n\n删除图片时，请使用 删除图片 图片ID`);
    } catch (error) {
      console.error("显示图片时出错:", error);
      return e.reply(`❌ 查看图片时发生错误: ${error.message}`);
    }
  }
}