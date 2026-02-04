/**
 * WPS 多维表格 AirScript - 自动导入 RSS 简报（简化版）
 * 专属配置：1159370261@qq.com
 * 
 * 使用说明：
 * 1. 先运行 simpleTest() 测试脚本是否正常
 * 2. 如果测试通过，再尝试运行 testConnection()
 */

// ========== 配置区域 ==========
var CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  USER_ID: '1159370261@qq.com',
  API_KEY: 'wps_1770173096274_b4pz5s',
  DAYS: 1,
  TABLE_NAME: 'Sheet1'
};
// ==============================

/**
 * 步骤1：简单测试 - 验证脚本基本功能
 * 先运行这个，确保脚本可以正常执行
 */
function simpleTest() {
  console.log('=== 简单测试开始 ===');
  console.log('用户ID: ' + CONFIG.USER_ID);
  console.log('API地址: ' + CONFIG.API_BASE_URL);
  console.log('表格名称: ' + CONFIG.TABLE_NAME);
  
  // 尝试多种弹窗方式
  try {
    Application.alert('✅ 脚本运行正常！\n\n配置信息：\n用户ID: ' + CONFIG.USER_ID + '\nAPI地址: ' + CONFIG.API_BASE_URL);
  } catch(e) {
    console.log('Application.alert 不可用，尝试其他方式');
    try {
      alert('✅ 脚本运行正常！\n\n配置信息：\n用户ID: ' + CONFIG.USER_ID + '\nAPI地址: ' + CONFIG.API_BASE_URL);
    } catch(e2) {
      console.log('alert 也不可用');
    }
  }
  
  console.log('=== 简单测试完成 ===');
  console.log('✅✅✅ 如果您看到这条消息，说明脚本运行成功！');
  console.log('配置信息：用户ID=' + CONFIG.USER_ID + ', API地址=' + CONFIG.API_BASE_URL);
}

/**
 * 步骤2：测试表格访问
 * 验证是否可以访问多维表格
 */
function testSheet() {
  console.log('=== 测试表格访问 ===');
  
  try {
    var sheet = Application.Sheets(CONFIG.TABLE_NAME);
    
    if (sheet) {
      console.log('✅ 成功访问表格: ' + CONFIG.TABLE_NAME);
      
      var records = sheet.Records;
      console.log('当前记录数: ' + records.length);
      
      Application.alert('✅ 表格访问成功！\n\n表格名称: ' + CONFIG.TABLE_NAME + '\n当前记录数: ' + records.length);
    } else {
      console.log('❌ 未找到表格: ' + CONFIG.TABLE_NAME);
      Application.alert('❌ 未找到表格！\n\n请检查 TABLE_NAME 配置是否正确\n当前配置: ' + CONFIG.TABLE_NAME);
    }
  } catch (error) {
    console.error('❌ 错误:', error);
    Application.alert('❌ 错误: ' + error.message);
  }
  
  console.log('=== 测试完成 ===');
}

/**
 * 步骤3：测试添加记录
 * 验证是否可以向表格添加数据
 */
function testAddRecord() {
  console.log('=== 测试添加记录 ===');
  
  try {
    var sheet = Application.Sheets(CONFIG.TABLE_NAME);
    
    if (!sheet) {
      Application.alert('❌ 未找到表格: ' + CONFIG.TABLE_NAME);
      return;
    }
    
    // 添加一条测试记录
    sheet.AddRecord({
      '标题': '测试标题 - ' + new Date().toLocaleString(),
      '内容': '这是一条测试内容',
      '摘要': '测试摘要',
      '来源': 'http://test.com',
      '分类': '测试',
      '质量分数': 10,
      '发布时间': new Date(),
      '导入时间': new Date()
    });
    
    console.log('✅ 成功添加测试记录');
    Application.alert('✅ 测试成功！\n\n已添加一条测试记录到表格中\n请查看表格确认');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    Application.alert('❌ 添加记录失败: ' + error.message + '\n\n可能原因：\n1. 字段名称不匹配\n2. 字段类型不正确\n3. 表格权限问题');
  }
  
  console.log('=== 测试完成 ===');
}

/**
 * 步骤4：手动输入 API 响应数据进行测试
 * 由于 AirScript 可能不支持 fetch，我们先手动测试数据导入逻辑
 */
function testImportWithMockData() {
  console.log('=== 测试模拟数据导入 ===');
  
  try {
    var sheet = Application.Sheets(CONFIG.TABLE_NAME);
    
    if (!sheet) {
      Application.alert('❌ 未找到表格: ' + CONFIG.TABLE_NAME);
      return;
    }
    
    // 模拟 API 返回的数据
    var mockData = {
      success: true,
      data: {
        totalItems: 2,
        items: [
          {
            title: 'RSS文章标题1',
            content: '这是文章内容1的详细描述...',
            summary: '这是文章1的摘要',
            source: 'https://example.com/article1',
            category: '技术',
            quality: 8.5,
            publishTime: new Date().toISOString()
          },
          {
            title: 'RSS文章标题2',
            content: '这是文章内容2的详细描述...',
            summary: '这是文章2的摘要',
            source: 'https://example.com/article2',
            category: '新闻',
            quality: 7.8,
            publishTime: new Date().toISOString()
          }
        ]
      }
    };
    
    var successCount = 0;
    var errorCount = 0;
    
    // 导入数据
    for (var i = 0; i < mockData.data.items.length; i++) {
      var item = mockData.data.items[i];
      
      try {
        // 检查是否重复
        var existingRecords = sheet.Records;
        var isDuplicate = false;
        
        for (var j = 0; j < existingRecords.length; j++) {
          if (existingRecords[j].标题 === item.title) {
            isDuplicate = true;
            break;
          }
        }
        
        if (isDuplicate) {
          console.log('跳过重复: ' + item.title);
          continue;
        }
        
        // 添加记录
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
    
    var message = '✅ 模拟数据导入完成！\n\n成功: ' + successCount + ' 条\n失败: ' + errorCount + ' 条';
    console.log(message);
    Application.alert(message);
    
  } catch (error) {
    console.error('❌ 错误:', error);
    Application.alert('❌ 导入失败: ' + error.message);
  }
  
  console.log('=== 测试完成 ===');
}

/**
 * 使用说明和测试步骤
 */
function showHelp() {
  var helpText = '📖 WPS AirScript 使用指南\n\n';
  helpText += '请按顺序执行以下测试：\n\n';
  helpText += '1️⃣ simpleTest()\n   测试脚本基本功能\n\n';
  helpText += '2️⃣ testSheet()\n   测试表格访问\n\n';
  helpText += '3️⃣ testAddRecord()\n   测试添加单条记录\n\n';
  helpText += '4️⃣ testImportWithMockData()\n   测试批量导入模拟数据\n\n';
  helpText += '如果以上测试都通过，说明脚本功能正常！\n\n';
  helpText += '⚠️ 注意：\n';
  helpText += '- 确保表格字段名称正确\n';
  helpText += '- 确保 TABLE_NAME 配置正确\n';
  helpText += '- WPS AirScript 可能不支持 fetch API';
  
  Application.alert(helpText);
}

/**
 * 主入口函数
 * WPS AirScript 会自动执行这个函数
 */
function main() {
  console.log('========================================');
  console.log('🚀 WPS AirScript 自动导入 RSS 简报');
  console.log('========================================');
  console.log('');
  
  // 默认运行简单测试
  console.log('📝 当前配置：');
  console.log('   用户ID: ' + CONFIG.USER_ID);
  console.log('   API地址: ' + CONFIG.API_BASE_URL);
  console.log('   表格名称: ' + CONFIG.TABLE_NAME);
  console.log('');
  
  console.log('🎯 开始执行测试...');
  console.log('');
  
  // 执行简单测试
  simpleTest();
}
