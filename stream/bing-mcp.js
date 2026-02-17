/**
 * 第三方 MCP 包装：必应搜索（bing-cn-mcp）
 * - 安装插件即自动注册，无需在 aistream.mcp.remote 里填写。
 * - Windows：使用 cmd /c npx；Linux/macOS：直接 npx。未安装时 optional 仅跳过不报错。
 * - 若不使用：删除本文件、或重命名为 bing-mcp.js.disabled、或让 getMcpServers 返回 {}。
 * - 需本机已安装 Node.js（npx）及 bing-cn-mcp 包（npx -y 会自动拉取）。
 */
export function getMcpServers() {
  const isWin = typeof process !== 'undefined' && process.platform === 'win32';
  return {
    'bing-search': isWin
      ? { command: 'cmd', args: ['/c', 'npx', '-y', 'bing-cn-mcp'], optional: true }
      : { command: 'npx', args: ['-y', 'bing-cn-mcp'], optional: true }
  };
}
