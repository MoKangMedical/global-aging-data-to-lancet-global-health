# OpenClaw 快速入门指南

## 🚀 5分钟快速上手

### 1. 熟悉项目结构（2分钟）

```bash
# 查看项目文件树
tree -L 2 -I 'node_modules|.git'

# 关键文件位置
client/src/pages/          # 前端页面
server/routers.ts          # 后端API定义
drizzle/schema.ts          # 数据库表结构
todo.md                    # 功能清单
```

### 2. 启动开发环境（1分钟）

```bash
cd /home/ubuntu/epi-research-platform

# 如果依赖已安装，直接启动
pnpm dev

# 访问预览地址
# https://3000-ib12w7p3mzmpnu812www6-bc8e5e97.us1.manus.computer
```

### 3. 理解核心工作流（2分钟）

```
用户上传研究方案 (PDF/Word)
    ↓
Python提取文本
    ↓
LLM分析PICO框架
    ↓
推荐Global Aging Data数据集
    ↓
用户上传数据 (CSV/Excel) ← 【待实现】
    ↓
Python执行统计分析 ← 【后端已完成，前端待连接】
    ↓
生成Lancet标准表格和图形 ← 【后端已完成，前端待连接】
    ↓
自动撰写论文 ← 【后端已完成，前端待连接】
    ↓
一键导出投稿包 ← 【待实现】
```

---

## 🎯 第一个任务：实现数据上传功能

### 目标
在项目详情页添加CSV/Excel数据上传功能，用户可以上传研究数据用于统计分析。

### 步骤

#### 1. 更新TODO清单
```bash
# 编辑 todo.md
- [ ] 实现CSV/Excel数据上传功能
  - [ ] 前端：创建数据上传组件
  - [ ] 后端：添加数据解析和存储路由
  - [ ] 数据预览和验证
```

#### 2. 数据库变更
```typescript
// drizzle/schema.ts
export const dataUploads = mysqlTable("data_uploads", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: varchar("file_key", { length: 512 }).notNull(),
  rowCount: int("row_count"),
  columnCount: int("column_count"),
  columnNames: json("column_names"), // 存储列名数组
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 运行迁移
// pnpm db:push
```

#### 3. 后端实现
```typescript
// server/db.ts
export async function createDataUpload(data: InsertDataUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(dataUploads).values(data);
}

export async function getDataUploadsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(dataUploads).where(eq(dataUploads.projectId, projectId));
}

// server/routers.ts
export const appRouter = router({
  // ... 现有路由
  data: router({
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        rowCount: z.number().optional(),
        columnCount: z.number().optional(),
        columnNames: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        await createDataUpload(input);
        return { success: true };
      }),
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await getDataUploadsByProjectId(input.projectId);
      }),
  }),
});
```

#### 4. 前端实现
```typescript
// client/src/components/DataUploader.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function DataUploader({ projectId }: { projectId: number }) {
  const [uploading, setUploading] = useState(false);
  const uploadMutation = trpc.data.upload.useMutation();
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("请上传CSV或Excel文件");
      return;
    }
    
    setUploading(true);
    
    try {
      // 1. 上传文件到服务器
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId.toString());
      
      const response = await fetch('/api/upload-data', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error("上传失败");
      
      const result = await response.json();
      
      // 2. 保存元数据到数据库
      await uploadMutation.mutateAsync({
        projectId,
        fileName: file.name,
        fileUrl: result.url,
        fileKey: result.key,
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        columnNames: result.columnNames,
      });
      
      toast.success("数据上传成功！");
    } catch (error) {
      toast.error("上传失败，请重试");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold mb-2">上传研究数据</h3>
      <p className="text-sm text-gray-600 mb-4">
        支持CSV和Excel格式，文件大小不超过50MB
      </p>
      <input
        type="file"
        accept=".csv,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
        id="data-upload"
        disabled={uploading}
      />
      <label htmlFor="data-upload">
        <Button asChild disabled={uploading}>
          <span>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "上传中..." : "选择文件"}
          </span>
        </Button>
      </label>
    </div>
  );
}

// 在 client/src/pages/ProjectDetail.tsx 中使用
import DataUploader from "@/components/DataUploader";

// 在适当位置添加
<DataUploader projectId={projectId} />
```

#### 5. 创建数据上传API处理器
```typescript
// server/dataUploadHandler.ts
import express from 'express';
import multer from 'multer';
import { storagePut } from '../storage/index.js';
import { nanoid } from 'nanoid';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

const upload = multer({ storage: multer.memoryStorage() });

export function registerDataUploadHandler(app: express.Application) {
  app.post('/api/upload-data', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const projectId = req.body.projectId;
      
      if (!file || !projectId) {
        return res.status(400).json({ error: "Missing file or projectId" });
      }
      
      // 1. 上传到S3
      const fileKey = `project-${projectId}/data/${nanoid()}-${file.originalname}`;
      const { url } = await storagePut(fileKey, file.buffer, file.mimetype);
      
      // 2. 解析数据获取元信息
      let rowCount = 0;
      let columnCount = 0;
      let columnNames: string[] = [];
      
      if (file.mimetype === 'text/csv') {
        const records = parse(file.buffer, { columns: true });
        rowCount = records.length;
        columnNames = Object.keys(records[0] || {});
        columnCount = columnNames.length;
      } else {
        // Excel文件
        const workbook = XLSX.read(file.buffer);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        rowCount = data.length;
        columnNames = Object.keys(data[0] || {});
        columnCount = columnNames.length;
      }
      
      res.json({
        url,
        key: fileKey,
        rowCount,
        columnCount,
        columnNames,
      });
    } catch (error) {
      console.error("Data upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });
}

// 在 server/_core/index.ts 中注册
import { registerDataUploadHandler } from '../dataUploadHandler.js';
registerDataUploadHandler(app);
```

#### 6. 安装依赖
```bash
pnpm add csv-parse xlsx
```

#### 7. 测试
```typescript
// server/data.upload.test.ts
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("data.upload", () => {
  it("should save data upload metadata", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };
    
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.data.upload({
      projectId: 1,
      fileName: "test_data.csv",
      fileUrl: "https://example.com/test.csv",
      fileKey: "project-1/data/test.csv",
      rowCount: 100,
      columnCount: 5,
      columnNames: ["age", "sex", "outcome", "exposure", "time"],
    });
    
    expect(result.success).toBe(true);
  });
});
```

#### 8. 运行测试并保存检查点
```bash
# 运行测试
pnpm test

# 如果测试通过，保存检查点
# 使用 webdev_save_checkpoint 工具
```

---

## 📚 学习资源

### 必读文档
1. **HANDOVER_TO_OPENCLAW.md** - 完整的项目交接文档
2. **todo.md** - 功能清单和待办事项
3. **README.md** (项目根目录) - 技术栈和开发指南

### 关键代码文件
- `server/routers.ts` - 查看现有API定义
- `server/uploadHandler.ts` - 文件上传实现参考
- `client/src/components/FileUploader.tsx` - 文件上传组件参考
- `server/auth.logout.test.ts` - 单元测试示例

### 调试技巧
```bash
# 查看服务器日志
tail -f /home/ubuntu/epi-research-platform/.manus-logs/devserver.log

# 查看浏览器控制台日志
tail -f /home/ubuntu/epi-research-platform/.manus-logs/browserConsole.log

# 查看网络请求日志
tail -f /home/ubuntu/epi-research-platform/.manus-logs/networkRequests.log
```

---

## 🆘 遇到问题？

### 常见问题速查

1. **TypeScript错误**
   ```bash
   pnpm check  # 运行类型检查
   ```

2. **数据库连接失败**
   ```bash
   pnpm db:push  # 重新推送数据库架构
   ```

3. **Python脚本错误**
   - 确保使用Python 3.11: `/usr/bin/python3.11`
   - 检查环境变量: `PYTHONPATH=/usr/local/lib/python3.11/site-packages`

4. **文件上传失败**
   - 检查`credentials: 'include'`
   - 查看networkRequests.log

### 获取帮助
- 查看 HANDOVER_TO_OPENCLAW.md 的"常见问题和解决方案"章节
- 参考现有代码实现
- 查看日志文件定位问题

---

## ✅ 完成第一个任务后

1. 更新todo.md，标记已完成的项目
2. 运行测试确保功能正常
3. 保存检查点
4. 继续下一个任务！

**祝你开发愉快！🎉**
