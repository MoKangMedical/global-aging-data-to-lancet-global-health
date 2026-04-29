# Global Aging Data to Lancet Global Health 项目交接文档

## 项目概述

**项目名称**: Global Aging Data to Lancet Global Health  
**项目定位**: 流行病学研究自动化分析平台  
**核心目标**: 从研究方案上传到Lancet Global Health标准论文的完整自动化工作流

**项目路径**: `/home/ubuntu/epi-research-platform`  
**当前版本**: e1f5c877  
**预览地址**: https://3000-ib12w7p3mzmpnu812www6-bc8e5e97.us1.manus.computer

---

## 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **路由**: Wouter 3.x
- **样式**: Tailwind CSS 4 + shadcn/ui
- **状态管理**: TanStack Query (React Query)
- **API通信**: tRPC 11
- **图表库**: Recharts
- **主题**: Lancet深红色 (#A51C30) + 深蓝色 (#4A5F8C)

### 后端
- **运行时**: Node.js 22 + Express 4
- **API层**: tRPC 11 (类型安全的RPC)
- **数据库**: MySQL/TiDB (通过Drizzle ORM)
- **认证**: Manus OAuth (已集成)
- **文件存储**: AWS S3 (已配置)
- **Python集成**: Python 3.11 (用于统计分析和文本提取)

### Python依赖
- **文档处理**: python-docx, PyPDF2, pdfplumber
- **统计分析**: lifelines, scikit-survival, scipy
- **数据可视化**: matplotlib, seaborn

---

## 项目结构

```
epi-research-platform/
├── client/                      # 前端代码
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   │   ├── Home.tsx        # 主页（包含交互式图表）
│   │   │   ├── Dashboard.tsx   # 项目仪表板
│   │   │   ├── NewProject.tsx  # 新建项目
│   │   │   └── ProjectDetail.tsx # 项目详情（文件上传、PICO分析）
│   │   ├── components/         # 可复用组件
│   │   │   ├── FileUploader.tsx        # 文件上传组件
│   │   │   ├── HRSChart.tsx            # Health & Retirement Studies图表
│   │   │   └── HarmonizedDataExplorer.tsx # 协调数据筛选器
│   │   ├── lib/trpc.ts         # tRPC客户端配置
│   │   └── index.css           # 全局样式（Lancet配色）
│   └── public/                 # 静态资源
│
├── server/                      # 后端代码
│   ├── routers.ts              # tRPC路由定义
│   ├── db.ts                   # 数据库查询辅助函数
│   ├── fileService.ts          # 文件上传和文本提取服务
│   ├── picoService.ts          # PICO分析服务（LLM驱动）
│   ├── statisticsService.ts    # 统计分析服务
│   ├── lancetOutputService.ts  # Lancet标准输出生成
│   ├── pubmedService.ts        # PubMed文献检索和论文生成
│   ├── uploadHandler.ts        # 文件上传API处理器
│   ├── extract_text.py         # Python文本提取脚本
│   └── _core/                  # 框架核心（不要修改）
│
├── drizzle/                     # 数据库
│   └── schema.ts               # 数据库表结构定义
│
├── docs/                        # 文档
│   ├── g2aging-research.md     # Global Aging Data平台研究
│   └── g2aging-homepage-design.md # 主页设计参考
│
└── todo.md                      # 功能清单和待办事项
```

---

## 已完成功能

### ✅ 核心功能模块

1. **用户认证系统**
   - Manus OAuth集成
   - 用户角色管理（admin/user）
   - 项目所有权控制

2. **研究方案上传与解析**
   - 支持PDF/Word文档上传
   - 文本自动提取（Python脚本）
   - 文件存储到S3

3. **PICO框架自动分析**
   - LLM驱动的研究问题解析
   - 识别人群（Population）、干预（Intervention）、对照（Comparison）、结局（Outcome）
   - Global Aging Data数据集兼容性评估
   - 数据集推荐和变量建议

4. **统计分析引擎（后端已实现，前端待连接）**
   - Kaplan-Meier生存分析
   - Cox比例风险回归模型
   - Fine-Gray竞争风险模型
   - 亚组分析和交互效应检验

5. **Lancet标准输出生成（后端已实现，前端待连接）**
   - 基线特征表（Table 1）
   - 回归结果表（OR/HR/β + 95% CI）
   - 生存曲线图（Kaplan-Meier）
   - 森林图（亚组分析）
   - 累积发生率曲线（竞争风险）

6. **PubMed文献检索（后端已实现，前端待连接）**
   - NCBI E-utilities API集成
   - 自动搜索相关文献
   - 格式化引用生成

7. **学术论文自动撰写（后端已实现，前端待连接）**
   - Lancet风格论文结构
   - 自动生成摘要、引言、方法、结果、讨论
   - 符合Lancet Global Health投稿要求

### ✅ 前端界面

1. **主页（Home.tsx）**
   - Hero区域展示平台核心价值
   - Global Aging Data统计数据展示（16研究、44国家、72调查）
   - Health & Retirement Studies交互式堆叠柱状图
   - Core Harmonized Data交互式筛选器
   - 6个功能模块介绍卡片
   - 4步研究工作流展示
   - Lancet Global Health论文展示区域

2. **项目仪表板（Dashboard.tsx）**
   - 项目列表展示
   - 创建新项目入口
   - 项目状态概览

3. **新建项目页面（NewProject.tsx）**
   - 项目信息表单
   - 研究类型选择

4. **项目详情页面（ProjectDetail.tsx）**
   - 文件上传功能（支持拖拽和点击选择）
   - PICO分析结果展示
   - 数据匹配推荐
   - 统计分析配置（占位）
   - 结果展示（占位）

### ✅ 配色和视觉设计

- **主色调**: Lancet深红色 (#A51C30)
- **辅助色**: 深蓝色 (#4A5F8C)、橙色 (#E67E22)
- **字体**: Inter (无衬线字体)
- **设计风格**: 简洁专业的学术界面

---

## 待实现功能（优先级排序）

### 🔴 高优先级

1. **数据上传功能**
   - [ ] 在项目详情页添加CSV/Excel数据上传界面
   - [ ] 数据预览和验证
   - [ ] 数据存储到数据库或S3
   - [ ] 连接到后端统计分析引擎

2. **统计分析前端集成**
   - [ ] 创建统计分析配置表单（选择暴露变量、结局变量、协变量）
   - [ ] 调用后端statisticsService的tRPC接口
   - [ ] 实时显示分析进度
   - [ ] 展示分析结果（表格和图形）

3. **Lancet标准输出前端展示**
   - [ ] 创建表格预览组件（可编辑）
   - [ ] 创建图形预览组件（可下载）
   - [ ] 支持表格导出为Word/Excel
   - [ ] 支持图形导出为PNG/PDF

4. **投稿包生成和下载**
   - [ ] 一键打包manuscript、tables、figures为ZIP文件
   - [ ] 符合Lancet Global Health投稿格式
   - [ ] 包含README说明文件

### 🟡 中优先级

5. **PICO分析结果优化**
   - [ ] 添加可视化的PICO框架图表
   - [ ] 支持用户编辑和微调AI分析结果
   - [ ] 保存修改后的PICO分析

6. **论文编辑器**
   - [ ] 集成富文本编辑器（如TipTap或Lexical）
   - [ ] 支持Markdown语法
   - [ ] 实时预览论文格式
   - [ ] 版本历史记录

7. **文献管理界面**
   - [ ] 展示PubMed检索结果
   - [ ] 支持手动添加/删除文献
   - [ ] 自动生成参考文献列表
   - [ ] 支持多种引用格式（Vancouver、APA等）

### 🟢 低优先级

8. **交互式世界地图**
   - [ ] 在主页添加可交互的世界地图
   - [ ] 展示44个国家的数据覆盖情况
   - [ ] 点击国家查看详细研究项目信息

9. **数据可视化增强**
   - [ ] 为HRS图表添加图例点击筛选功能
   - [ ] 添加数据懒加载和虚拟滚动
   - [ ] 支持图表导出为交互式HTML

10. **协作功能**
    - [ ] 项目成员管理
    - [ ] 评论和批注功能
    - [ ] 实时协作编辑

---

## 数据库架构

### 核心数据表

```typescript
// drizzle/schema.ts

users                    // 用户表
├── id                  // 主键
├── openId              // Manus OAuth ID
├── name                // 用户名
├── email               // 邮箱
├── role                // 角色（admin/user）
└── timestamps          // 创建/更新时间

projects                 // 研究项目表
├── id                  // 主键
├── userId              // 用户ID（外键）
├── title               // 项目标题
├── description         // 项目描述
├── researchType        // 研究类型
└── status              // 项目状态

uploadedFiles           // 上传文件表
├── id                  // 主键
├── projectId           // 项目ID（外键）
├── fileName            // 文件名
├── fileUrl             // S3文件URL
├── fileKey             // S3文件键
├── mimeType            // 文件类型
└── extractedText       // 提取的文本

picoAnalyses            // PICO分析结果表
├── id                  // 主键
├── projectId           // 项目ID（外键）
├── population          // 人群
├── intervention        // 干预
├── comparison          // 对照
├── outcome             // 结局
├── exposure            // 暴露因素
└── datasetSuggestions  // 数据集推荐（JSON）

statisticalAnalyses     // 统计分析结果表
├── id                  // 主键
├── projectId           // 项目ID（外键）
├── analysisType        // 分析类型
├── pythonCode          // Python代码
└── results             // 分析结果（JSON）

generatedTables         // 生成的表格表
├── id                  // 主键
├── analysisId          // 分析ID（外键）
├── tableType           // 表格类型
├── tableData           // 表格数据（JSON）
└── lancetFormatted     // Lancet格式化内容

generatedFigures        // 生成的图形表
├── id                  // 主键
├── analysisId          // 分析ID（外键）
├── figureType          // 图形类型
├── figureUrl           // 图形URL
└── caption             // 图注

manuscripts             // 论文草稿表
├── id                  // 主键
├── projectId           // 项目ID（外键）
├── title               // 论文标题
├── abstract            // 摘要
├── introduction        // 引言
├── methods             // 方法
├── results             // 结果
└── discussion          // 讨论

citations               // 文献引用表
├── id                  // 主键
├── manuscriptId        // 论文ID（外键）
├── pmid                // PubMed ID
├── title               // 文献标题
├── authors             // 作者
├── journal             // 期刊
└── year                // 年份
```

---

## 关键技术实现

### 1. 文件上传流程

```typescript
// 前端: client/src/components/FileUploader.tsx
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include', // 重要：发送cookie
  });
};

// 后端: server/uploadHandler.ts
// 1. multer接收文件
// 2. 上传到S3
// 3. 调用Python脚本提取文本
// 4. 调用picoService进行PICO分析
// 5. 保存到数据库
```

### 2. PICO分析实现

```typescript
// server/picoService.ts
export async function analyzePICO(text: string) {
  // 使用LLM的JSON Schema模式
  const response = await invokeLLM({
    messages: [
      { role: "system", content: PICO_SYSTEM_PROMPT },
      { role: "user", content: text }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pico_analysis",
        strict: true,
        schema: PICO_SCHEMA
      }
    }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 3. Python统计分析调用

```typescript
// server/statisticsService.ts
import { spawn } from 'child_process';

export async function runKaplanMeier(data: any) {
  return new Promise((resolve, reject) => {
    const python = spawn('/usr/bin/python3.11', [
      '-c',
      KAPLAN_MEIER_SCRIPT,
      JSON.stringify(data)
    ], {
      env: {
        PATH: '/usr/bin:/bin',
        PYTHONPATH: '/usr/local/lib/python3.11/site-packages'
      }
    });
    
    // 处理stdout和stderr
  });
}
```

### 4. tRPC路由定义

```typescript
// server/routers.ts
export const appRouter = router({
  project: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getProjectsByUserId(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ title: z.string(), ... }))
      .mutation(async ({ ctx, input }) => {
        return await createProject({ userId: ctx.user.id, ...input });
      }),
  }),
  // ... 其他路由
});
```

---

## 开发指南

### 启动项目

```bash
cd /home/ubuntu/epi-research-platform

# 安装依赖
pnpm install

# 推送数据库架构
pnpm db:push

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test
```

### 添加新功能的步骤

1. **更新TODO清单**
   ```bash
   # 在todo.md中添加新的待办事项
   - [ ] 新功能描述
   ```

2. **数据库变更（如需要）**
   ```typescript
   // 1. 修改 drizzle/schema.ts
   // 2. 运行 pnpm db:push
   ```

3. **后端实现**
   ```typescript
   // 1. 在 server/db.ts 添加查询函数
   // 2. 在 server/routers.ts 添加tRPC路由
   // 3. 编写单元测试 server/*.test.ts
   ```

4. **前端实现**
   ```typescript
   // 1. 在 client/src/pages/ 或 client/src/components/ 创建组件
   // 2. 使用 trpc.*.useQuery 或 trpc.*.useMutation 调用后端
   // 3. 更新 client/src/App.tsx 添加路由（如需要）
   ```

5. **测试和验证**
   ```bash
   pnpm test           # 运行单元测试
   pnpm check          # TypeScript类型检查
   ```

6. **保存检查点**
   ```bash
   # 使用webdev_save_checkpoint工具
   ```

### 代码规范

1. **TypeScript严格模式**
   - 所有文件必须通过TypeScript检查
   - 避免使用`any`类型

2. **tRPC优先**
   - 所有后端API使用tRPC定义
   - 不要创建手动的REST端点（除非特殊需求如文件上传）

3. **组件设计**
   - 优先使用shadcn/ui组件
   - 保持组件单一职责
   - 使用Tailwind CSS类名

4. **错误处理**
   - 前端使用toast提示用户
   - 后端抛出TRPCError并附带清晰的错误消息

5. **测试覆盖**
   - 每个tRPC路由必须有对应的单元测试
   - 参考 server/auth.logout.test.ts

---

## 常见问题和解决方案

### 1. Python环境问题

**问题**: 出现"SRE module mismatch"错误  
**解决方案**: 使用Python 3.11而不是3.13
```typescript
const python = spawn('/usr/bin/python3.11', [...], {
  env: {
    PATH: '/usr/bin:/bin',
    PYTHONPATH: '/usr/local/lib/python3.11/site-packages'
  }
});
```

### 2. 文件上传失败

**问题**: 文件上传后没有响应  
**解决方案**: 
- 确保前端使用`credentials: 'include'`发送cookie
- 检查后端认证中间件是否正确配置
- 查看`.manus-logs/devserver.log`和`networkRequests.log`

### 3. LLM JSON Schema错误

**问题**: "expected string for type"错误  
**解决方案**: 使用正确的JSON Schema语法
```typescript
// ❌ 错误
{ type: ["string", "null"] }

// ✅ 正确
{ anyOf: [{ type: "string" }, { type: "null" }] }
```

### 4. 图表不显示

**问题**: Recharts图表渲染空白  
**解决方案**:
- 检查数据格式是否正确
- 确保容器有明确的高度
- 使用ResponsiveContainer包裹图表

---

## 项目资源

### 文档
- [Global Aging Data官网](https://g2aging.org/)
- [Lancet Global Health投稿指南](https://www.thelancet.com/journals/langlo/home)
- [NCBI E-utilities API文档](https://www.ncbi.nlm.nih.gov/books/NBK25500/)

### 设计参考
- Lancet杂志配色: #A51C30 (深红色)
- Global Aging Data统计数据: 16研究、44国家、72调查、227K+问题
- 论文展示区域: 3篇高影响力论文

### 技术文档
- [tRPC官方文档](https://trpc.io/)
- [Drizzle ORM文档](https://orm.drizzle.team/)
- [Recharts文档](https://recharts.org/)
- [shadcn/ui组件库](https://ui.shadcn.com/)

---

## 联系方式

**项目所有者**: 小林  
**角色**: 科研工作者、医生、药物研发、医疗大数据  
**项目路径**: `/home/ubuntu/epi-research-platform`  
**当前版本**: e1f5c877

---

## 交接清单

### ✅ 已完成
- [x] 项目架构设计
- [x] 数据库表结构定义
- [x] 用户认证系统
- [x] 文件上传和文本提取
- [x] PICO自动分析（LLM驱动）
- [x] 统计分析引擎（后端）
- [x] Lancet标准输出生成（后端）
- [x] PubMed文献检索（后端）
- [x] 论文自动撰写（后端）
- [x] 主页交互式图表
- [x] 项目管理界面
- [x] Lancet配色应用

### 🔄 待OpenClaw完成
- [ ] 数据上传功能（CSV/Excel）
- [ ] 统计分析前端集成
- [ ] Lancet标准输出前端展示
- [ ] 投稿包生成和下载
- [ ] PICO分析结果可视化和编辑
- [ ] 论文编辑器
- [ ] 文献管理界面
- [ ] 交互式世界地图
- [ ] 数据可视化增强
- [ ] 协作功能

---

## 建议的开发顺序

1. **第一阶段（核心功能完善）**
   - 数据上传功能
   - 统计分析前端集成
   - Lancet标准输出前端展示

2. **第二阶段（用户体验优化）**
   - PICO分析结果可视化和编辑
   - 投稿包生成和下载
   - 论文编辑器

3. **第三阶段（高级功能）**
   - 文献管理界面
   - 交互式世界地图
   - 协作功能

---

## 注意事项

1. **不要修改`server/_core/`目录**：这是框架核心代码
2. **使用Python 3.11**：避免Python 3.13的兼容性问题
3. **保持Lancet配色一致性**：主色#A51C30，辅助色#4A5F8C
4. **优先使用tRPC**：避免创建手动REST API
5. **编写单元测试**：每个新功能都需要测试覆盖
6. **保存检查点**：重要功能完成后立即保存

---

**祝OpenClaw开发顺利！如有问题，请参考项目文档或查看已有代码实现。**
