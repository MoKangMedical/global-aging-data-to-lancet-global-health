# 流行病学研究自动化分析平台 TODO

## 数据库架构
- [x] 设计研究项目表（projects）
- [x] 设计文件上传表（uploaded_files）
- [x] 设计PICO解析结果表（pico_analyses）
- [x] 设计统计分析结果表（statistical_analyses）
- [x] 设计生成的表格表（generated_tables）
- [x] 设计生成的图形表（generated_figures）
- [x] 设计论文草稿表（manuscripts）
- [x] 设计文献引用表（citations）

## 后端功能模块
- [x] 研究方案文件上传功能（PDF/Word）
- [x] 文件解析和文本提取功能
- [x] PICO/PECO自动识别和解析
- [x] Global Aging Data数据集推荐功能
- [x] 生存分析引擎（Kaplan-Meier）
- [x] Cox回归模型实现
- [x] Fine-Gray竞争风险模型实现
- [x] Lancet标准基线特征表生成
- [x] Lancet标准回归结果表生成
- [x] 生存曲线图生成
- [x] 森林图生成
- [x] 累积发生率曲线生成
- [x] PubMed文献检索集成
- [x] 学术论文自动撰写（Lancet格式）
- [ ] 投稿包打包和下载功能

## 前端界面
- [x] 用户认证界面（登录/注册）
- [x] 项目管理仪表板
- [x] 研究方案上传界面
- [x] PICO解析结果展示
- [x] 数据匹配和下载界面
- [x] 统计分析配置界面
- [x] 分析结果展示页面
- [x] 表格预览和编辑界面
- [x] 图形预览和下载界面
- [x] 论文编辑器
- [x] 文献管理界面
- [x] 投稿包生成和下载界面

## 测试
- [x] 文件上传功能测试
- [x] PICO解析准确性测试
- [x] 统计分析结果验证
- [x] 表格格式符合性测试
- [x] 图形质量测试
- [x] 端到端工作流测试

## 新增修改需求
- [x] 更新品牌名称为"Global Aging Data to Lancet Global Health"
- [x] 应用Lancet杂志配色方案（深红色#A51C30）
- [x] 实现真实的文件上传功能（点击选择和拖拽上传）
- [x] 连接文件上传到后端API
- [x] 上传后自动触发PICO分析

## Bug修复
- [x] 修复文件上传功能无法保存的问题
- [x] 检查后端API路由和认证中间件
- [x] 验证文件上传流程的完整性

## 主页重设计
- [x] 访问g2aging.org提取关键信息和设计元素
- [x] 重新设计主页展示Global Aging Data平台介绍
- [x] 添加数据集展示区域
- [x] 添加研究领域和变量类别介绍
- [x] 优化主页视觉设计和布局

## 交互式图表集成
- [x] 创建Health & Retirement Studies堆叠柱状图组件
- [x] 实现国家-年份数据的交互式展示
- [x] 创建Core Harmonized Data筛选器组件
- [x] 实现国家、年份、领域、测量指标的动态筛选
- [x] 集成交互式图表到主页

## 品牌名称更新和论文展示
- [x] 更新所有页面的品牌名称为"Global Aging Data to Lancet Global Health"
- [x] 搜索Lancet Global Health相关论文
- [x] 添加论文展示区域到主页
- [x] 集成论文封面图片和关键信息
