/**
 * 将爬取的预报格式化为 QQ 消息文本
 */
export function formatForecastCard(data, queryName) {
  const title = queryName || data.cityName
  const lines = [
    `【${title}】中央气象台 7 天预报`,
    data.province ? `省份：${data.province}` : '',
    data.published ? `发布时间：${data.published}` : '',
    `来源：${data.url}`,
    '',
  ].filter(Boolean)

  for (const d of data.days) {
    let line = `${d.date} ${d.weekday}  ${d.day.weather} ${d.high}/${d.low}  ${d.day.wind}`
    if (d.night?.weather) {
      line += `  夜间${d.night.weather} ${d.night.wind}`
    }
    lines.push(line)
  }

  return lines.join('\n')
}
