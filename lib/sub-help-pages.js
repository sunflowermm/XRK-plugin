/** 子帮助页内容（与主帮助共用 help_template 渲染） */
export const SUB_HELP_PAGES = {
  emoji: {
    title: '全局表情帮助',
    groups: [
      {
        group: '表情实现相关',
        list: [
          { icon: 11, title: '#开启全局表情', desc: '开启当前群的全局表情' },
          { icon: 12, title: '#关闭全局表情', desc: '关闭当前群的全局表情' },
          { icon: 13, title: '#设置全局表情概率 x.xx', desc: '设定表情触发概率' }
        ]
      },
      {
        group: '偷图辅助帮助',
        list: [
          { icon: 14, title: '收藏图片|偷图', desc: '收藏图片到指定目录' },
          { icon: 15, title: '删除图片', desc: '删除指定关键词的图片' },
          { icon: 16, title: '#查看全部图片', desc: '查看所有已收藏图片' },
          { icon: 17, title: '#偷图设置目录', desc: '设置偷图图片保存目录' },
          { icon: 18, title: '#查看可用目录', desc: '查看所有可用目录' }
        ]
      }
    ]
  },
  feet: {
    title: '刷步数相关帮助',
    groups: [
      {
        group: 'Zepp刷步数帮助',
        list: [
          { icon: 11, title: '下载注册', desc: '应用商店搜索 Zepp，使用 QQ 邮箱注册' },
          { icon: 12, title: '绑定微信', desc: '注册完成后绑定微信，记住账号密码' },
          { icon: 13, title: '#刷步数账号:密码:步数', desc: '例：#刷步数123456:123456:1000' },
          { icon: 14, title: '#绑定步数账号:密码', desc: '绑定后发送 #刷步数1000 即可刷步' },
          { icon: 15, title: '使用限制', desc: '账密正确；每 QQ 号每日仅可绑定刷一次' },
          { icon: 16, title: '首次刷步', desc: '新注册建议手机登录满一天后再刷' },
          { icon: 17, title: '说明', desc: '官方接口，稳定防封；有问题请联系作者' }
        ]
      }
    ]
  },
  news: {
    title: '早报推送向日葵独家版',
    groups: [
      {
        group: '早报推送',
        list: [
          { icon: 4, title: '#查看早报白名单', desc: '' },
          { icon: 5, title: '#早报删除白名单xxx', desc: '群号' },
          { icon: 6, title: '#早报添加白名单xxx', desc: '群号' },
          { icon: 7, title: '#修改早报推送时间xxx', desc: '小时' }
        ]
      }
    ]
  },
  time: {
    title: '整点报时插件帮助',
    groups: [
      {
        group: '整点报时',
        list: [
          { icon: 1, title: '#查看整点报时白名单', desc: '' },
          { icon: 2, title: '#整点报时添加白名单xxx', desc: '群号' },
          { icon: 3, title: '#整点报时删除白名单xxx', desc: '群号' }
        ]
      }
    ]
  },
  plugins: {
    title: '插件管理帮助',
    groups: [
      {
        group: '动动插件',
        list: [
          { icon: 11, title: '#查插件', desc: '查看已安装插件（含停用）' },
          { icon: 12, title: '#删插件[序号]', desc: '删除指定序号插件' },
          { icon: 13, title: '#停用插件[序号]', desc: '' },
          { icon: 13, title: '#启用插件[序号]', desc: '' }
        ]
      },
      {
        group: '加加插件',
        list: [
          { icon: 14, title: '#安装插件列表(种类)', desc: '' },
          { icon: 15, title: '#插件查询(插件名)', desc: '' },
          { icon: 16, title: '#安装插件(插件名)', desc: '' },
          { icon: 18, title: '说明', desc: '支持推荐/文娱/IP/游戏/JS 等分类与别名' }
        ]
      }
    ]
  },
  master: {
    title: '主人相关帮助',
    groups: [
      {
        group: '主人管理',
        list: [
          { icon: 1, title: '#核心主人xxxxx', desc: '喵崽暂不支持核心主人' },
          { icon: 2, title: '#主人添加xxxxx', desc: '' },
          { icon: 3, title: '#删主人xxxxx', desc: '' },
          { icon: 3, title: '首次添加', desc: '需 stdin 用户添加；核心主人不可被删' },
          { icon: 3, title: '多开用户', desc: '#主人添加Bot账号:主人账号' }
        ]
      }
    ]
  }
};
