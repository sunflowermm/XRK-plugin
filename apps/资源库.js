import plugin from '../../../lib/plugins/plugin.js';
import hub from '../lib/xrk-hub.js';
import { fetchJson } from '../lib/fetch-json.js';
import { resolveImageBuffer } from '../lib/fetch-media.js';

const XXAPI = 'https://v2.xxapi.cn/api';

const pickXxapi = (d) => (d?.code === 200 && d.data ? d.data : null);
const pickPaiii = (d) => d?.url || null;
const pickJsms = (d) => (d?.success && d.url ? d.url : null);

/** 随机图（R 插件不做；抖音链接解析交给 R） */
const IMAGE = {
  random: [
    async () => pickPaiii(await fetchJson('https://t.paiii.cn/api/random?format=json')),
    async () => pickJsms(await fetchJson('https://cloud.jsms2.cn/api/image/image.php?mode=json&type=random')),
    async () => pickXxapi(await fetchJson(`${XXAPI}/wallpaper?return=json`))
  ],
  touhou: ['https://img.paulzzh.com/touhou/random'],
  anime: [
    async () => pickJsms(await fetchJson('https://cloud.jsms2.cn/api/image/image.php?mode=json&type=random')),
    async () => pickPaiii(await fetchJson('https://t.paiii.cn/api/random?format=json')),
    'https://api.mtyqx.cn/api/random.php'
  ],
  cos: [async () => pickXxapi(await fetchJson(`${XXAPI}/yscos?return=json`))],
  meizi: [async () => pickXxapi(await fetchJson(`${XXAPI}/meinvpic?return=json`))],
  wallpaper: [async () => pickXxapi(await fetchJson(`${XXAPI}/wallpaper?return=json`))],
  heisiPic: [async () => pickXxapi(await fetchJson(`${XXAPI}/heisi?return=json`))],
  baisiPic: [async () => pickXxapi(await fetchJson(`${XXAPI}/baisi?return=json`))],
  jkPic: [async () => pickXxapi(await fetchJson(`${XXAPI}/jk?return=json`))]
};

export class AvatarPlugin extends plugin {
  constructor() {
    super({
      name: '向日葵资源库',
      dsc: '向日葵随机图',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^#?(xrk|向日葵)?随机(图|图片)$', fnc: 'img_random' },
        { reg: '^#?(xrk|向日葵)?(随机)?东方图$', fnc: 'img_touhou' },
        { reg: '^#?(xrk|向日葵)?(随机)?二次元图$', fnc: 'img_anime' },
        { reg: '^#?(xrk|向日葵)?cos图$', fnc: 'img_cos' },
        { reg: '^#?(xrk|向日葵)?妹子图$', fnc: 'img_meizi' },
        { reg: '^#?(xrk|向日葵)?随机壁纸$', fnc: 'img_wallpaper' },
        { reg: '^#?(xrk|向日葵)?黑丝图$', fnc: 'img_heisi' },
        { reg: '^#?(xrk|向日葵)?白丝图$', fnc: 'img_baisi' },
        { reg: '^#?(xrk|向日葵)?jk图$', fnc: 'img_jk' }
      ]
    });
  }

  async sendImgFromSources(sources) {
    if (!hub.config.sharing) return false;
    const buf = await resolveImageBuffer(sources);
    if (!buf) {
      await this.e.reply('资源获取失败，接口可能暂时不可用，请稍后再试');
      return false;
    }
    await this.e.reply(['芝士你要的图片', segment.image(buf)]);
    return true;
  }

  img_random() { return this.sendImgFromSources(IMAGE.random); }
  img_touhou() { return this.sendImgFromSources(IMAGE.touhou); }
  img_anime() { return this.sendImgFromSources(IMAGE.anime); }
  img_cos() { return this.sendImgFromSources(IMAGE.cos); }
  img_meizi() { return this.sendImgFromSources(IMAGE.meizi); }
  img_wallpaper() { return this.sendImgFromSources(IMAGE.wallpaper); }
  img_heisi() { return this.sendImgFromSources(IMAGE.heisiPic); }
  img_baisi() { return this.sendImgFromSources(IMAGE.baisiPic); }
  img_jk() { return this.sendImgFromSources(IMAGE.jkPic); }
}
