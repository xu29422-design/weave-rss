/**
 * WPS 多维表格 AirScript - RSS 简报自动导入（最终版）
 * 专属配置：1159370261@qq.com
 * 
 * 重要：使用前请在【工具栏】→【服务】中添加"网络API"服务
 */

// ==================== 配置区 ====================
var CONFIG = {
  API_BASE_URL: 'http://localhost:3000',              // 本地测试地址，部署后改为：https://your-domain.com
  USER_ID: '1159370261@qq.com',                       // 您的用户ID
  API_KEY: 'wps_1770173096274_b4pz5s',                // 您的API密钥
  TABLE_NAME: 'Sheet1'                                // 多维表格名称（请修改为实际名称）
};
// ==============================================

/**
 * 主函数 - 自动执行
 */
function main() {
  console.log('========================================');
  console.log('开始导入 RSS 简报数据');
  console.log('时间: ' + new Date().toLocaleString());
  console.log('========================================');
  console.log('');
  
  try {
    // 1. 获取数据表
    console.log('步骤 1/5: 连接数据表...');
    var sheet = Application.Sheets(CONFIG.TABLE_NAME);
    if (!sheet) {
      console.log('❌ 错误: 未找到数据表 "' + CONFIG.TABLE_NAME + '"');
      console.log('请修改 CONFIG.TABLE_NAME 为实际的表格名称');
      return;
    }
    console.log('✓ 成功连接到数据表: ' + CONFIG.TABLE_NAME);
    console.log('');
    
    // 2. 构建 API URL
    console.log('步骤 2/5: 准备 API 请求...');
    var apiUrl = CONFIG.API_BASE_URL + '/api/digest/latest?userId=' + encodeURIComponent(CONFIG.USER_ID) + '&apiKey=' + CONFIG.API_KEY + '&days=1';
    console.log('API 地址: ' + apiUrl);
    console.log('');
    
    // 3. 调用 API 获取数据（使用 WPS 的 HTTP 对象）
    console.log('步骤 3/5: 获取数据...');
    var response = HTTP.get(apiUrl, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 检查响应状态
    if (response.status !== 200) {
      console.log('❌ API 请求失败');
      console.log('状态码: ' + response.status);
      console.log('状态: ' + response.statusText);
      return;
    }
    console.log('✓ 成功获取响应 (状态码: ' + response.status + ')');
    console.log('');
    
    // 4. 解析 JSON 数据
    console.log('步骤 4/5: 解析数据...');
    var result = response.json();
    
    if (!result.success) {
      console.log('❌ API 返回错误: ' + (result.error || '未知错误'));
      return;
    }
    
    if (!result.data.items || result.data.items.length === 0) {
      console.log('⚠️  暂无新数据');
      console.log('');
      console.log('可能原因：');
      console.log('  1. 还没有订阅 RSS 源');
      console.log('  2. 今天还没有生成简报');
      console.log('  3. 数据已经导入过了');
      return;
    }
    
    console.log('✓ 成功解析数据，共 ' + result.data.items.length + ' 条');
    console.log('');
    
    // 5. 导入数据
    console.log('步骤 5/5: 导入数据到表格...');
    var successCount = 0;
    var skipCount = 0;
    var errorCount = 0;
    
    var existingRecords = sheet.Records;
    console.log('当前表格已有 ' + existingRecords.length + ' 条记录');
    console.log('');
    
    for (var i = 0; i < result.data.items.length; i++) {
      var item = result.data.items[i];
      
      try {
        // 检查是否重复（根据标题）
        var isDuplicate = false;
        for (var j = 0; j < existingRecords.length; j++) {
          if (existingRecords[j]['标题'] === item.title) {
            isDuplicate = true;
            break;
          }
        }
        
        if (isDuplicate) {
          skipCount++;
          console.log('○ 跳过重复: ' + item.title);
          continue;
        }
        
        // 添加记录
        sheet.AddRecord({
          '标题': item.title || '',
          '内容': item.content || '',
          '摘要': item.summary || '',
          '来源': item.source || '',
          '分类': item.category || '未分类',
          '质量分数': item.quality || 0,
          '发布时间': new Date(item.publishTime),
          '导入时间': new Date()
        });
        
        successCount++;
        console.log('✓ 导入成功: ' + item.title);
        
      } catch (error) {
        errorCount++;
        console.log('✗ 导入失败: ' + item.title);
        console.log('  错误: ' + error);
      }
    }
    
    // 6. 输出结果
    console.log('');
    console.log('========================================');
    console.log('导入完成！');
    console.log('========================================');
    console.log('成功: ' + successCount + ' 条');
    console.log('跳过: ' + skipCount + ' 条（重复）');
    console.log('失败: ' + errorCount + ' 条');
    console.log('总计: ' + result.data.items.length + ' 条');
    console.log('========================================');
    
  } catch (error) {
    console.log('');
    console.log('❌ 脚本执行错误: ' + error);
    console.log('');
    console.log('常见问题排查：');
    console.log('  1. 是否在【工具栏】→【服务】中添加了"网络API"服务？');
    console.log('  2. API 地址是否正确？本地服务是否正在运行？');
    console.log('  3. 表格名称是否正确？');
    console.log('  4. 表格字段是否完整？需要：标题、内容、摘要、来源、分类、质量分数、发布时间、导入时间');
  }
}

// 自动执行主函数
main();
