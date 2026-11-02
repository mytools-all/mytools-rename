# 文件批量重命名

文件批量重命名

版本：0.1.0；适用于 MyTools，不能作为独立网页调用宿主能力。

## 安装

在 MyTools 插件管理的 npm 安装入口输入 `@mytools-all/mytools-rename@0.1.0`。也可以下载本仓库，在开发者页面选择“安装本地目录”。

## 开发

直接编辑本目录的 HTML、JavaScript 和样式，无需依赖宿主源码或其他插件仓库。修改后重新安装本地目录。运行 `npm test` 检查包内契约和逻辑。插件 API 规范见 [mytools](https://github.com/mytools-all/mytools/tree/main/docs)。

## 权限

声明的宿主能力：fs.pickdirectory、fs.pickfiles、fs.search、fs.renamemany、clipboard.write、fs.importdropped。目录和危险操作仍需用户授权。

## 许可

项目代码使用 MIT；随附的第三方代码遵循各自随附的许可证。
