/**
 * WPS 多维表格 AirScript - 自动导入 RSS 简报
 * 专属配置：1159370261@qq.com
 * 定时从 RSS 系统拉取最新数据并写入多维表格
 * 使用传统 Promise 语法，兼容 WPS AirScript
 */

// ========== 配置区域 ==========
var CONFIG = {
  // 您的 API 基础地址（本地测试）
  API_BASE_URL: 'http://localhost:3000',
  
  // ⚠️ 部署到生产环境后，请改为：
  // API_BASE_URL: 'https://your-domain.com',
  
  // 您的用户 ID（已配置）
  USER_ID: '1159370261@qq.com',
  
  // 您的 API Key（已生成）
  API_KEY: 'wps_1770173096274_b4pz5s',
  
  // 获取最近几天的数据
  DAYS: 1,
  
  // 数据表名称（请修改为您的实际表格名称）
  TABLE_NAME: 'Sheet1'
};
// ==============================

/**
 * 主函数：从 API 获取数据并写入表格
 * 使用 Promise 链式调用，不使用 async/await
 */
function importRSSDigest() {
  console.log('开始导入 RSS 简报数据...');
  console.log('用户: ' + CONFIG.USER_ID);
  
  // 1. 构建 API URL
  var encodedUserId = encodeURIComponent(CONFIG.USER_ID);
  var apiUrl = CONFIG.API_BASE_URL + '/api/digest/latest?userId=' + encodedUserId + '&days=' + CONFIG.DAYS + '&apiKey=' + CONFIG.API_KEY;
  
  console.log('请求 URL:', apiUrl);
  
  // 2. 调用 API 获取数据（使用 Promise 语法）
  fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }
    return response.json();
  })
  .then(function(result) {
    if (!result.success) {
      throw new Error(result.error || '获取数据失败');
    }
    
    console.log('成功获取数据，共 ' + result.data.totalItems + ' 条记录');
    
    // 3. 获取当前活动表
    var sheet = Application.Sheets(CONFIG.TABLE_NAME);
    if (!sheet) {
      throw new Error('未找到名为 "' + CONFIG.TABLE_NAME + '" 的数据表');
    }
    
    // 4. 检查数据是否为空
    if (!result.data.items || result.data.items.length === 0) {
      var message = '暂无新数据，可能原因：\n1. 还没有订阅 RSS 源\n2. 今天还没有生成简报\n3. 简报数据已经导入过了';
      console.log(message);
      Application.alert(message);
      return;
    }
    
    // 5. 写入数据到表格
    var successCount = 0;
    var errorCount = 0;
    
    for (var i = 0; i < result.data.items.length; i++) {
      var item = result.data.items[i];
      try {
        // 检查是否已存在（根据标题去重）
        var existingRecords = sheet.Records;
        var isDuplicate = false;
        
        for (var j = 0; j < existingRecords.length; j++) {
          if (existingRecords[j].标题 === item.title) {
            isDuplicate = true;
            break;
          }
        }
        
        if (isDuplicate) {
          console.log('跳过重复记录: ' + item.title);
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
        console.log('✓ 成功导入: ' + item.title);
        
      } catch (error) {
        errorCount++;
        console.error('✗ 导入失败: ' + item.title, error);
      }
    }
    
    // 6. 输出结果
    var message = '导入完成！\n成功: ' + successCount + ' 条\n失败: ' + errorCount + ' 条\n总计: ' + result.data.totalItems + ' 条';
    console.log(message);
    Application.alert(message);
  })
  .catch(function(error) {
    console.error('导入失败:', error);
    var errorMessage = '导入失败: ' + error.message + '\n\n请检查：\n1. 网络连接是否正常\n2. API 地址是否正确\n3. 用户 ID 和 API Key 是否正确';
    Application.alert(errorMessage);
  });
}

/**
 * 手动触发导入（用于测试）
 */
function testImport() {
  console.log('=== 开始手动测试导入 ===');
  importRSSDigest();
}

/**
 * 定时任务入口
 * 在定时任务配置中调用此函数
 */
function scheduledImport() {
  console.log('=== 定时任务触发 ===');
  importRSSDigest();
}

/**
 * 测试 API 连接
 * 仅测试 API 是否可以访问，不导入数据
 */
function testConnection() {
  console.log('测试 API 连接...');
  
  var encodedUserId = encodeURIComponent(CONFIG.USER_ID);
  var apiUrl = CONFIG.API_BASE_URL + '/api/digest/latest?userId=' + encodedUserId + '&apiKey=' + CONFIG.API_KEY;
  
  fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }
    return response.json();
  })
  .then(function(result) {
    if (result.success) {
      var message = '✅ API 连接成功！\n数据条数: ' + (result.data.totalItems || 0);
      console.log(message);
      Application.alert(message);
    } else {
      throw new Error(result.error || '未知错误');
    }
  })
  .catch(function(error) {
    var errorMessage = '❌ API 连接失败: ' + error.message;
    console.error(errorMessage);
    Application.alert(errorMessage);
  });
}

/**
 * 简化测试版本 - 仅测试基本功能
 * 如果上面的函数还有问题，可以试试这个
 */
function simpleTest() {
  console.log('简单测试开始...');
  Application.alert('脚本运行正常！\n配置信息：\n用户ID: ' + CONFIG.USER_ID + '\nAPI地址: ' + CONFIG.API_BASE_URL);
}
