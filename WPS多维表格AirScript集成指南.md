# WPS 多维表格 AirScript 集成指南

## 方案概述

使用 **WPS 多维表格的定时任务（AirScript）** 定期从我们的系统拉取 RSS 简报数据，自动写入多维表格。

## 优势

✅ **配置简单**：无需在系统中配置复杂的 WPS 凭证  
✅ **灵活可控**：在多维表格内自由控制拉取频率和数据处理  
✅ **职责分离**：RSS 系统只负责提供数据，WPS 负责数据的获取和展示  
✅ **降低耦合**：两个系统独立运行，互不影响

---

## 步骤一：准备多维表格

### 1. 创建多维表格
在 WPS 中创建一个新的多维表格（数据库表格）

### 2. 创建字段
建议创建以下字段：

| 字段名 | 字段类型 | 说明 |
|--------|---------|------|
| 标题 | 单行文本 | 文章标题 |
| 内容 | 多行文本 | 文章内容 |
| 摘要 | 多行文本 | AI 生成的摘要 |
| 来源 | 网址 | 文章原始链接 |
| 分类 | 单选 | 内容分类 |
| 质量分数 | 数字 | 内容质量评分 |
| 发布时间 | 日期时间 | 文章发布时间 |
| 导入时间 | 日期时间 | 导入到表格的时间 |

---

## 步骤二：获取 API 访问信息

### 1. 获取用户 ID
登录系统后，在个人中心可以看到您的用户 ID

### 2. 生成 API Key（可选，用于安全验证）
访问：`https://your-domain.com/api/digest/latest`

POST 请求示例：
```bash
curl -X POST https://your-domain.com/api/digest/latest \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id"}'
```

响应：
```json
{
  "success": true,
  "data": {
    "apiKey": "wps_1234567890_abc123",
    "message": "API Key 已生成，请妥善保管"
  }
}
```

### 3. API 调用示例
```
GET https://your-domain.com/api/digest/latest?userId=your-user-id&apiKey=your-api-key&days=1
```

参数说明：
- `userId`（必填）：您的用户 ID
- `apiKey`（可选）：API 密钥，用于安全验证
- `days`（可选）：获取最近几天的数据，默认为 1

---

## 步骤三：创建 AirScript 脚本

### 1. 打开脚本编辑器
在 WPS 多维表格中：
1. 点击顶部菜单「脚本」→「JS脚本」→「新建脚本」
2. 输入脚本名称，如：「自动导入RSS简报」

### 2. 复制以下代码

```javascript
/**
 * WPS 多维表格 AirScript - 自动导入 RSS 简报
 * 定时从 RSS 系统拉取最新数据并写入多维表格
 */

// ========== 配置区域 ==========
const CONFIG = {
  // 您的 API 基础地址
  API_BASE_URL: 'https://your-domain.com',
  
  // 您的用户 ID（必填）
  USER_ID: 'your-user-id',
  
  // 您的 API Key（可选，用于安全验证）
  API_KEY: 'wps_1234567890_abc123',
  
  // 获取最近几天的数据
  DAYS: 1,
  
  // 数据表名称（当前活动表）
  TABLE_NAME: 'Sheet1'
};
// ==============================

/**
 * 主函数：从 API 获取数据并写入表格
 */
async function importRSSDigest() {
  try {
    console.log('开始导入 RSS 简报数据...');
    
    // 1. 构建 API URL
    const apiUrl = `${CONFIG.API_BASE_URL}/api/digest/latest?userId=${CONFIG.USER_ID}&days=${CONFIG.DAYS}`;
    const finalUrl = CONFIG.API_KEY ? `${apiUrl}&apiKey=${CONFIG.API_KEY}` : apiUrl;
    
    console.log('请求 URL:', finalUrl);
    
    // 2. 调用 API 获取数据
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '获取数据失败');
    }
    
    console.log(`成功获取数据，共 ${result.data.totalItems} 条记录`);
    
    // 3. 获取当前活动表
    const sheet = Application.Sheets(CONFIG.TABLE_NAME);
    if (!sheet) {
      throw new Error(`未找到名为 "${CONFIG.TABLE_NAME}" 的数据表`);
    }
    
    // 4. 写入数据到表格
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of result.data.items) {
      try {
        // 检查是否已存在（根据标题去重）
        const existingRecords = sheet.Records;
        const isDuplicate = existingRecords.some(record => 
          record.标题 === item.title
        );
        
        if (isDuplicate) {
          console.log(`跳过重复记录: ${item.title}`);
          continue;
        }
        
        // 添加新记录
        sheet.AddRecord({
          '标题': item.title,
          '内容': item.content,
          '摘要': item.summary,
          '来源': item.source,
          '分类': item.category || '未分类',
          '质量分数': item.quality || 0,
          '发布时间': new Date(item.publishTime),
          '导入时间': new Date()
        });
        
        successCount++;
        console.log(`✓ 成功导入: ${item.title}`);
        
      } catch (error) {
        errorCount++;
        console.error(`✗ 导入失败: ${item.title}`, error);
      }
    }
    
    // 5. 输出结果
    const message = `导入完成！成功: ${successCount} 条，失败: ${errorCount} 条`;
    console.log(message);
    
    // 显示通知（可选）
    Application.alert(message);
    
    return {
      success: true,
      successCount,
      errorCount,
      totalCount: result.data.totalItems
    };
    
  } catch (error) {
    console.error('导入失败:', error);
    Application.alert(`导入失败: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 手动触发导入（用于测试）
 */
function testImport() {
  importRSSDigest();
}

/**
 * 定时任务入口
 * 在定时任务配置中调用此函数
 */
function scheduledImport() {
  return importRSSDigest();
}
```

### 3. 修改配置
将代码中的配置项替换为您的实际信息：
- `API_BASE_URL`：您的系统域名
- `USER_ID`：您的用户 ID
- `API_KEY`：您的 API Key（如果启用了验证）
- `TABLE_NAME`：您的数据表名称

### 4. 保存脚本
点击「保存」按钮保存脚本

---

## 步骤四：设置定时任务

### 1. 创建定时任务
1. 在脚本编辑器中，点击「定时任务」
2. 点击「新建定时任务」
3. 配置任务：
   - **任务名称**：自动导入 RSS 简报
   - **执行函数**：`scheduledImport`
   - **执行频率**：根据需求设置（建议每天一次）
     - 例如：每天上午 9:00
   - **启用任务**：勾选

### 2. 测试运行
在设置定时任务之前，可以先手动测试：
1. 在脚本编辑器中点击「运行」
2. 选择执行函数：`testImport`
3. 查看控制台输出和表格数据

---

## 步骤五：验证和监控

### 1. 查看执行日志
在定时任务管理中可以查看每次执行的日志和结果

### 2. 数据去重
脚本会自动根据标题去重，避免重复导入相同的内容

### 3. 错误处理
如果导入失败，会在控制台显示错误信息，可以根据错误信息排查问题

---

## 常见问题

### Q1: 提示 "获取数据失败"
**解决方案**：
- 检查 `USER_ID` 是否正确
- 检查 `API_KEY` 是否正确（如果启用了验证）
- 确认 API 地址可以访问

### Q2: 数据导入不完整
**解决方案**：
- 检查多维表格字段名是否与代码中的字段名完全一致
- 查看控制台日志，了解哪些记录导入失败

### Q3: 定时任务没有执行
**解决方案**：
- 确认定时任务已启用
- 检查执行函数名是否正确（`scheduledImport`）
- 查看定时任务的执行日志

### Q4: 如何修改导入频率
**解决方案**：
- 在定时任务配置中修改执行频率
- 或修改 `CONFIG.DAYS` 参数，获取更多天的历史数据

---

## 高级功能

### 1. 自定义数据处理
可以在 `importRSSDigest` 函数中添加自定义的数据处理逻辑：

```javascript
// 例如：只导入质量分数大于 8 的内容
if (item.quality < 8) {
  console.log(`跳过低质量内容: ${item.title}`);
  continue;
}
```

### 2. 数据格式化
可以在写入前对数据进行格式化：

```javascript
'内容': item.content.substring(0, 500), // 只保留前 500 字符
'摘要': item.summary || '暂无摘要', // 提供默认值
```

### 3. 通知提醒
可以添加更详细的通知：

```javascript
if (successCount > 0) {
  Application.alert(`成功导入 ${successCount} 条新内容！`);
}
```

---

## 技术支持

如有问题，请联系技术支持或查看项目文档。

## 相关文档

- WPS 开放平台文档：https://open.kdocs.cn/
- AirScript 开发文档：https://365.kdocs.cn/3rd/open/documents/
