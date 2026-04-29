# Global Aging Data 平台研究报告

## 平台概述

**Gateway to Global Aging Data (g2aging.org)** 是一个由美国南加州大学（USC）和RAND公司开发的全球老龄化数据平台，由美国国立老龄研究所（NIA）资助。

### 核心数据资源

- **16个研究项目** 覆盖 **44个国家**
- **72个调查波次** 包含 **227,401个调查问题**
- **11个协调数据集** 提供 **59,116个协调变量**
- **365,694名受访者** 产生 **1,043,906个观测值**

### 主要数据集

1. **Health & Retirement Studies (HRS)** - 美国
2. **RAND HRS** - 美国（RAND版本）
3. **Harmonized MHAS** - 墨西哥健康与老龄化研究
4. **Harmonized ELSA** - 英国老龄化纵向研究
5. **Harmonized SHARE** - 欧洲健康、老龄化和退休调查
6. **Harmonized CRELES** - 哥斯达黎加
7. **Harmonized KLoSA** - 韩国老龄化纵向研究
8. **Harmonized JSTAR** - 日本老龄化与退休研究
9. **Harmonized TILDA** - 爱尔兰老龄化纵向研究
10. **Harmonized CHARLS** - 中国健康与养老追踪调查
11. **Harmonized LASI** - 印度老龄化纵向研究
12. **Harmonized MARS** - 马来西亚老龄化与退休调查

## 数据访问方式

### 数据分发模式

根据平台说明，协调数据文件通过两种方式分发：

1. **原始研究机构分发**：部分数据集由原始研究机构直接提供
2. **Gateway平台分发**：部分数据集通过Gateway平台提供

### 数据访问要求

每个数据集都有**数据访问说明（DATA ACCESS INSTRUCTION）**，需要：

- 用户注册和认证
- 同意数据使用协议
- 遵守各研究项目的数据访问政策

### 数据格式

- 提供**协调变量（Harmonized Variables）**：跨研究标准化的研究就绪变量
- 包含**详细文档和代码本（Codebook）**
- 数据格式通常为 Stata、SAS、SPSS 或 CSV

## API和自动化访问的限制

### 关键发现

**Gateway平台目前不提供公开的REST API用于程序化数据下载**。数据访问流程为：

1. 用户必须通过Web界面注册账户
2. 浏览和选择所需数据集
3. 阅读并同意数据使用协议
4. 手动下载数据文件
5. 部分数据集需要向原始研究机构申请访问权限

### 技术实现建议

由于缺乏公开API，我们的平台可以采用以下策略：

#### 方案A：用户手动上传数据（推荐）

- 用户从g2aging.org手动下载所需数据集
- 在我们的平台上传数据文件
- 平台解析数据并与研究方案匹配

**优点**：
- 符合数据使用协议
- 不违反平台使用条款
- 技术实现简单可靠

**缺点**：
- 需要用户额外操作步骤
- 无法完全自动化

#### 方案B：模拟数据集和变量匹配

- 维护g2aging.org数据集的元数据库（变量名称、描述、数据字典）
- 根据PICO分析结果，推荐适合的数据集和变量
- 提供数据集下载链接，引导用户访问g2aging.org
- 用户下载后上传到我们的平台

**优点**：
- 提供智能推荐功能
- 帮助用户快速定位相关数据
- 符合伦理和法律要求

**缺点**：
- 需要维护数据集元数据
- 仍需用户手动下载

#### 方案C：数据飞地（Data Enclave）集成

- g2aging.org提供了**Data Enclave**功能
- 这是一个安全的远程分析环境
- 可能支持API访问（需要进一步调查）

**需要调查**：
- Data Enclave是否提供API
- 访问权限和费用
- 技术集成可行性

## 变量匹配策略

### 协调变量的优势

Gateway的协调数据集已经标准化了变量定义，这对我们的平台非常有利：

- **标准化命名**：相同概念的变量在不同研究中使用相同名称
- **一致定义**：变量定义和编码方式统一
- **详细文档**：每个变量都有清晰的文档说明

### 实现PICO到变量的映射

我们可以构建一个**变量映射知识库**：

```
PICO元素 → Gateway协调变量
例如：
- Population: "Age 60+" → 变量 "age", "age_group"
- Outcome: "Mortality" → 变量 "died", "death_date", "survival_time"
- Exposure: "Diabetes" → 变量 "diabetes", "diabetes_diagnosed"
```

## 下一步行动

### 立即实施

1. **构建变量映射数据库**：收集Gateway协调变量的元数据
2. **实现文件上传功能**：支持用户上传从g2aging.org下载的数据
3. **开发数据集推荐引擎**：根据PICO分析推荐合适的数据集

### 未来探索

1. **调查Data Enclave API**：探索是否有程序化访问方式
2. **联系Gateway团队**：询问是否可以获得API访问权限用于研究工具开发
3. **考虑合作机会**：可能与Gateway团队建立合作关系

## 参考资源

- Gateway主页: https://g2aging.org/
- 数据下载页面: https://g2aging.org/harmonized-data/get-data
- 研究规划工具: https://g2aging.org/research-planner
- 帮助文档: https://g2aging.org/help/faqs
- PubMed文章: https://pmc.ncbi.nlm.nih.gov/articles/PMC8186854/
