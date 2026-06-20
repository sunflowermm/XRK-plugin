import plugin from '../../../lib/plugins/plugin.js';
import hub from '../lib/xrk-hub.js';
import { fetchJson } from '../lib/fetch-json.js';

const MMP = 'https://api.mmp.cc/api';
const XXAPI = 'https://v2.xxapi.cn/api';

const VIDEO = {
  random: `${MMP}/ksvideo?type=json`,
  baisi: `${MMP}/ksvideo?type=json&id=BaiSi`,
  heisi: `${MMP}/ksvideo?type=json&id=HeiSi`,
  jk: `${MMP}/ksvideo?type=json&id=jk`,
  gzlxjj: `${MMP}/ksvideo?type=json&id=GaoZhiLiangXiaoJieJie`,
  rewu: `${MMP}/ksvideo?type=json&id=ReWu`,
  luoli: `${MMP}/ksvideo?type=json&id=LuoLi`
};

/** 已实测可用的图片源（按优先级尝试） */
const IMAGE = {
  random: [
    async () => pickDmoe(await fetchJson('https://www.dmoe.cc/random.php?return=json')),
    async () => pickPaiii(await fetchJson('https://t.paiii.cn/api/random?format=json')),
    async () => pickJsms(await fetchJson('https://cloud.jsms2.cn/api/image/image.php?mode=json&type=random'))
  ],
  touhou: ['https://img.paulzzh.com/touhou/random'],
  anime: [
    async () => pickJsms(await fetchJson('https://cloud.jsms2.cn/api/image/image.php?mode=json&type=random')),
    async () => pickPaiii(await fetchJson('https://t.paiii.cn/api/random?format=json')),
    'https://api.mtyqx.cn/api/random.php'
  ],
  cos: [
    async () => pickXxapi(await fetchJson(`${XXAPI}/yscos?return=json`)),
    `${MMP}/kswallpaper?category=cos&type=jpg`
  ],
  meizi: [
    async () => pickXxapi(await fetchJson(`${XXAPI}/meinvpic?return=json`)),
    `${MMP}/kswallpaper?category=meizi&type=jpg`
  ],
  wallpaper: [
    async () => pickXxapi(await fetchJson(`${XXAPI}/wallpaper?return=json`))
  ],
  heisiPic: [async () => pickXxapi(await fetchJson(`${XXAPI}/heisi?return=json`))],
  baisiPic: [async () => pickXxapi(await fetchJson(`${XXAPI}/baisi?return=json`))],
  jkPic: [async () => pickXxapi(await fetchJson(`${XXAPI}/jk?return=json`))]
};

function pickXxapi(data) {
  return data?.code === 200 && data.data ? data.data : null;
}

function pickDmoe(data) {
  return data?.code == 200 && data.imgurl ? data.imgurl : null;
}

function pickPaiii(data) {
  return data?.url || null;
}

function pickJsms(data) {
  return data?.success && data.url ? data.url : null;
}

async function resolveImage(sources) {
  for (const src of sources) {
    const url = typeof src === 'function' ? await src() : src;
    if (url) return url;
  }
  return null;
}

export class AvatarPlugin extends plugin {
  constructor() {
    super({
      name: '向日葵资源库',
      dsc: '向日葵资源库',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^#?随机图片$', fnc: 'img_random' },
        { reg: '^#?(随机)?东方图$', fnc: 'img_touhou' },
        { reg: '^#?(随机)?二次元图$', fnc: 'img_anime' },
        { reg: '^#?cos图$', fnc: 'img_cos' },
        { reg: '^#?妹子图$', fnc: 'img_meizi' },
        { reg: '^#?随机壁纸$', fnc: 'img_wallpaper' },
        { reg: '^#?黑丝图$', fnc: 'img_heisi' },
        { reg: '^#?白丝图$', fnc: 'img_baisi' },
        { reg: '^#?jk图$', fnc: 'img_jk' },
        { reg: '^#?白丝(视频)?$', fnc: 'vid_baisi' },
        { reg: '^#?黑丝(视频)?$', fnc: 'vid_heisi' },
        { reg: '^#?jk(视频)?$', fnc: 'vid_jk' },
        { reg: '^#?高质量小姐姐(视频)?$', fnc: 'vid_gzlxjj' },
        { reg: '^#?热舞(视频)?$', fnc: 'vid_rewu' },
        { reg: '^#?萝莉(视频)?$', fnc: 'vid_luoli' },
        { reg: '^#?小姐姐(视频)?$', fnc: 'vid_random' }
      ]
    });
  }

  checkSharing() {
    return hub.sharing;
  }

  async sendImgFromSources(sources) {
    if (!this.checkSharing()) return false;
    const url = await resolveImage(sources);
    if (!url) {
      await this.e.reply('资源获取失败，接口可能暂时不可用，请稍后再试');
      return false;
    }
    await this.e.reply(['芝士你要的图片', segment.image(url)]);
    return true;
  }

  async sendVideo(url) {
    if (!this.checkSharing()) return false;
    const data = await fetchJson(url);
    if (data.status !== 'success' || !data.link) {
      await this.e.reply('视频获取失败，接口可能暂时不可用，请稍后再试');
      return false;
    }
    await this.e.reply([segment.video(data.link), '看吧涩批！']);
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

  vid_baisi() { return this.sendVideo(VIDEO.baisi); }
  vid_heisi() { return this.sendVideo(VIDEO.heisi); }
  vid_jk() { return this.sendVideo(VIDEO.jk); }
  vid_gzlxjj() { return this.sendVideo(VIDEO.gzlxjj); }
  vid_rewu() { return this.sendVideo(VIDEO.rewu); }
  vid_luoli() { return this.sendVideo(VIDEO.luoli); }
  vid_random() { return this.sendVideo(VIDEO.random); }
}
