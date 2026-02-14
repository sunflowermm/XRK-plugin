import plugin from "../../../lib/plugins/plugin.js";
import fs from "fs";
import path from "path";
import { getGroupSettings } from "./全局表情设置.js";
import xrkconfig from "../components/xrkconfig.js";

async function sendRandomImage(e) {
    const emojiDir = xrkconfig.emoji_filename;
    const imageDir = path.join(process.cwd(), `plugins/XRK-plugin/resources/emoji/${emojiDir}`);
    try {
        if (!fs.existsSync(imageDir)) {
            await e.reply(`指定的目录不存在：${emojiDir}`, false, { recallMsg: 5 });
            return;
        }
        const imageFiles = await fs.promises.readdir(imageDir);
        const validFiles = imageFiles.filter(file => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file));
        if (validFiles.length > 0) {
            const randomImagePath = path.join(imageDir, validFiles[Math.floor(Math.random() * validFiles.length)]);
            await e.reply([segment.image(randomImagePath)]);
        } else {
            await e.reply("没有有效的图片文件。", false, { recallMsg: 5 });
        }
    } catch (error) {
        console.error("读取图片文件时出错:", error);
        await e.reply("加载图片失败。", false, { recallMsg: 5 });
    }
}


export class GlobalEmojiPlugin extends plugin {
    constructor() {
        super({
            name: "全局表情系统",
            dsc: "触发随机全局表情",
            event: "message",
            priority: 666666666666,
            rule: [
                {
                    reg: ".*",
                    fnc: "checkAndTrigger",
                    log: false,
                }
            ],
        });
    }

    async checkAndTrigger(e) {
        if (!e.group_id) return false;
        
        try {
            const settings = await getGroupSettings(e.group_id);
            if (settings.probability > 0) {
                const randomValue = Math.random();
                if (randomValue < settings.probability) {
                    await sendRandomImage(e);
                }
            }
        } catch (error) {
            console.error("触发全局表情时出错:", error);
        }
        
        return true;
    }
}