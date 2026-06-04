const url = 'http://www.nmc.cn/publish/forecast/ABJ/beijing.html'
const t = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text())
const rests = [...new Set(t.match(/\/rest\/[a-zA-Z0-9_/.\-?=&]+/g) || [])]
console.log('rest', rests.slice(0, 15))
const scripts = t.match(/<script[^>]*src="([^"]+)"/g)?.slice(0, 8)
console.log('scripts', scripts)
const dataUrl = t.match(/data-url="([^"]+)"/g)?.slice(0, 5)
console.log('data-url', dataUrl)
const hour = t.match(/id="hour[^"]*"/g)
console.log('hour ids', hour?.slice(0, 3))
