# 数据查询与二维码生成工具

基于 Tauri + React + TypeScript 开发的跨平台桌面应用程序。

![GitHub Actions](https://github.com/inernoro/md_code_query_tools/actions/workflows/build.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 功能特性

- 📁 支持读取本地 CSV、TXT、XLSX、XLS 数据文件
- 🔍 根据指定数字/字母进行数据查询（区分大小写）
- 📱 自动生成查询结果的二维码（200x200px）
- ✅ 支持数据核销功能（不可撤销）
- 📋 查询历史记录（最近100条）
- 💾 数据本地持久化存储

## 下载安装

从 [Releases](https://github.com/inernoro/md_code_query_tools/releases) 页面下载最新版本：

### Windows
- `md_code_query_tools_x.x.x_x64-setup.exe` - NSIS 安装包（推荐）
- `md_code_query_tools_x.x.x_x64.msi` - MSI 安装包
- `md_code_query_tools_x.x.x_x64-portable.exe` - 便携版（无需安装）

### macOS
- `md_code_query_tools_x.x.x_x64.dmg` - DMG 安装包

> ⚠️ **macOS 用户注意**：由于应用未经 Apple 公证，首次打开可能提示"已损坏"或"无法验证开发者"。请执行以下命令解除限制：
> ```bash
> # 方法 1：解除 DMG 文件限制
> xattr -cr ~/Downloads/md_code_query_tools_*.dmg
> 
> # 方法 2：安装后解除 App 限制
> sudo xattr -rd com.apple.quarantine /Applications/md_code_query_tools.app
> ```

### Linux
- `md_code_query_tools_x.x.x_amd64.deb` - Debian/Ubuntu 安装包
- `md_code_query_tools_x.x.x_amd64.AppImage` - AppImage 便携版

## 数据文件格式

支持的数据文件格式：CSV、TXT、XLSX、XLS

文件结构要求（第一行为表头）：

| 编号 | 链接 |
|------|------|
| ABC123 | https://example.com/data/123 |
| DEF456 | https://example.com/data/456 |

- 第一列：唯一标识符（用于查询）
- 第二列：关联链接（用于生成二维码）
- CSV/TXT 支持分隔符：逗号、制表符、分号（自动检测）
- 支持编码：UTF-8、GBK、GB18030

## 数据存储位置

查询次数、核销状态、历史记录保存在：

| 平台 | 路径 |
|------|------|
| Windows | `C:\Users\<用户名>\AppData\Roaming\DataQueryTool\Data\` |
| macOS | `~/Library/Application Support/DataQueryTool/Data/` |
| Linux | `~/.local/share/DataQueryTool/Data/` |

## 开发环境

### 环境要求

- Node.js 18+
- Rust 1.70+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri:dev
```

### 构建打包

```bash
npm run tauri:build
```

打包后的安装文件位于 `src-tauri/target/release/bundle/` 目录。

## 技术栈

- **框架**: Tauri 2.x
- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS
- **后端**: Rust
- **文件处理**: csv + calamine (Rust)
- **二维码**: qrcode.react

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Enter | 查询 |
| Ctrl+S | 保存二维码 |
| 右键二维码 | 保存为PNG |

## License

MIT License
