# 第三方许可说明

本项目原创代码采用 Apache-2.0；第三方代码不因此重新授权。

依据 `pnpm-lock.yaml` 在 Linux x64 安装后核查（2026-11-18），以下清单包括生产依赖及开发/构建依赖，不包括未安装的其他平台可选二进制。分发其他平台的工具链时，应重新核查相应包。

安装包内的许可证、版权及 NOTICE 原文汇总在 [THIRD_PARTY_LICENSES.txt](./public/THIRD_PARTY_LICENSES.txt)，构建后该文件保留在站点根目录。

## 资源及特殊说明

- Vue、Vue Router、Pinia、Element Plus 及 Element Plus 图标保留各自 MIT 许可。
- Lightning CSS 及其平台包为 MPL-2.0 构建依赖，不改为 Apache-2.0；若修改或再分发其受覆盖文件/二进制，须继续履行 MPL 的通知及相应源码提供义务。仅使用该工具构建应用不自动使应用源码适用 MPL。
- `index.html` 通过 Google Fonts 引入 Inter，字体按 SIL Open Font License 1.1 使用；对应原文附在许可汇总末尾。当前仓库未内置字体文件；如改成自托管，须连同字体版权和许可一起分发。
- `public/logo.svg` 与 `public/favicon.svg` 为项目内绘制 SVG，随本项目许可。OpenMetadata 仅为界面风格参考，未将其名称、商标或代码声明为本项目作品。
- 本次未发现仓库已有根级 LICENSE/NOTICE 被覆盖。本清单是依赖与资源核查记录，不替代历史贡献者权属确认。

## 核查范围与待确认项

- `@rolldown/binding-linux-x64-gnu` 包未附独立许可证文件；汇总中补入同版本 Rolldown 上游 LICENSE。
- `lodash-unified@1.0.3` 元数据声明 MIT，但 npm 包未附许可证原文；尚需向上游核实对应版权与许可全文，不能将本次清单视为完整法律审计。其依赖的 lodash / lodash-es 原文已保留。

## 已安装依赖清单

| 包 | 版本 | 许可证 |
|---|---|---|
| `@babel/helper-string-parser` | 7.29.13, 8.0.8 | MIT |
| `@babel/helper-validator-identifier` | 7.29.7, 8.0.6 | MIT |
| `@babel/parser` | 7.29.13, 8.1.0 | MIT |
| `@babel/types` | 7.29.11, 8.1.0 | MIT |
| `@ctrl/tinycolor` | 4.3.0 | MIT |
| `@element-plus/icons-vue` | 2.3.2 | MIT |
| `@floating-ui/core` | 1.8.0 | MIT |
| `@floating-ui/dom` | 1.8.0 | MIT |
| `@floating-ui/utils` | 0.2.12 | MIT |
| `@jridgewell/gen-mapping` | 0.3.13 | MIT |
| `@jridgewell/remapping` | 2.3.5 | MIT |
| `@jridgewell/resolve-uri` | 3.1.2 | MIT |
| `@jridgewell/sourcemap-codec` | 1.6.0 | MIT |
| `@jridgewell/trace-mapping` | 0.3.31 | MIT |
| `@oxc-project/types` | 0.156.0 | MIT |
| `@rolldown/binding-linux-x64-gnu` | 1.2.18 | MIT |
| `@rolldown/pluginutils` | 1.1.0 | MIT |
| `@sxzz/popperjs-es` | 2.11.8 | MIT |
| `@types/estree` | 1.0.10 | MIT |
| `@types/lodash` | 4.17.27 | MIT |
| `@types/lodash-es` | 4.17.12 | MIT |
| `@types/node` | 24.19.2 | MIT |
| `@types/web-bluetooth` | 0.0.21 | MIT |
| `@vitejs/plugin-vue` | 6.0.10 | MIT |
| `@volar/language-core` | 2.4.30 | MIT |
| `@volar/language-service` | 2.4.30 | MIT |
| `@volar/source-map` | 2.4.30 | MIT |
| `@volar/typescript` | 2.4.30 | MIT |
| `@vue-macros/common` | 3.1.4 | MIT |
| `@vue/compiler-core` | 3.5.45 | MIT |
| `@vue/compiler-dom` | 3.5.45 | MIT |
| `@vue/compiler-sfc` | 3.5.45 | MIT |
| `@vue/compiler-ssr` | 3.5.45 | MIT |
| `@vue/devtools-api` | 8.2.1 | MIT |
| `@vue/devtools-kit` | 8.2.1 | MIT |
| `@vue/devtools-shared` | 8.2.1 | MIT |
| `@vue/language-core` | 3.3.14 | MIT |
| `@vue/reactivity` | 3.5.45 | MIT |
| `@vue/runtime-core` | 3.5.45 | MIT |
| `@vue/runtime-dom` | 3.5.45 | MIT |
| `@vue/server-renderer` | 3.5.45 | MIT |
| `@vue/shared` | 3.5.45 | MIT |
| `@vue/tsconfig` | 0.9.1 | MIT |
| `@vueuse/core` | 15.0.0 | MIT |
| `@vueuse/metadata` | 15.0.0 | MIT |
| `@vueuse/shared` | 15.0.0 | MIT |
| `acorn` | 8.19.0 | MIT |
| `alien-signals` | 3.2.1 | MIT |
| `ast-kit` | 2.2.0, 3.0.1 | MIT |
| `ast-walker-scope` | 0.10.0 | MIT |
| `async-validator` | 4.2.5 | MIT |
| `birpc` | 2.9.0 | MIT |
| `chokidar` | 5.0.0 | MIT |
| `confbox` | 0.1.8, 0.3.2 | MIT |
| `csstype` | 3.2.3 | MIT |
| `dayjs` | 1.11.23 | MIT |
| `detect-libc` | 2.1.2 | Apache-2.0 |
| `element-plus` | 2.14.8 | MIT |
| `entities` | 7.0.1 | BSD-2-Clause |
| `estree-walker` | 2.0.2, 3.0.3 | MIT |
| `exsolve` | 1.2.0 | MIT |
| `fdir` | 6.5.0 | MIT |
| `hookable` | 5.5.3 | MIT |
| `lightningcss` | 1.33.0 | MPL-2.0 |
| `lightningcss-linux-x64-gnu` | 1.33.0 | MPL-2.0 |
| `local-pkg` | 1.2.1 | MIT |
| `lodash` | 4.18.1 | MIT |
| `lodash-es` | 4.18.1 | MIT |
| `lodash-unified` | 1.0.3 | MIT |
| `magic-string` | 0.30.21, 1.4.5 | MIT |
| `magic-string-ast` | 1.0.3 | MIT |
| `memoize-one` | 6.0.0 | MIT |
| `mlly` | 1.8.2 | MIT |
| `muggle-string` | 0.4.1 | MIT |
| `nanoid` | 3.3.20 | MIT |
| `normalize-wheel-es` | 1.2.0 | BSD-3-Clause |
| `nostics` | 1.3.0 | MIT |
| `path-browserify` | 1.0.1 | MIT |
| `pathe` | 2.0.3 | MIT |
| `perfect-debounce` | 2.1.0 | MIT |
| `picocolors` | 1.1.1 | ISC |
| `picomatch` | 4.0.7 | MIT |
| `pinia` | 4.1.0 | MIT |
| `pkg-types` | 1.3.1, 2.4.0 | MIT |
| `postcss` | 8.5.32 | MIT |
| `quansync` | 0.2.11 | MIT |
| `readdirp` | 5.1.1 | MIT |
| `rolldown` | 1.2.18 | MIT |
| `scule` | 1.3.0 | MIT |
| `source-map-js` | 1.2.2 | BSD-3-Clause |
| `tinyglobby` | 0.2.17 | MIT |
| `typescript` | 6.0.3 | Apache-2.0 |
| `ufo` | 1.6.4 | MIT |
| `undici-types` | 7.24.6 | MIT |
| `unplugin` | 3.7.0 | MIT |
| `unplugin-utils` | 0.3.2 | MIT |
| `vite` | 8.3.7 | MIT |
| `vscode-jsonrpc` | 10.0.0 | MIT |
| `vscode-languageserver-protocol` | 3.18.5 | MIT |
| `vscode-languageserver-textdocument` | 1.0.16 | MIT |
| `vscode-languageserver-types` | 3.18.5 | MIT |
| `vscode-uri` | 3.2.0 | MIT |
| `vue` | 3.5.45 | MIT |
| `vue-component-type-helpers` | 3.3.14 | MIT |
| `vue-router` | 5.4.0 | MIT |
| `vue-tsc` | 3.3.14 | MIT |
| `webpack-virtual-modules` | 0.6.2 | MIT |
