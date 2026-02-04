/**
 * WPS 多维表格 AirScript - RSS 简报自动导入（简洁版）
 * 专属配置：1159370261@qq.com
 * 
 * 功能：定时从 API 拉取最新 RSS 简报并自动导入到多维表格
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
  
  try {
    // 1. 获取数据表
    var sheet = Application.Sheets(CONFIG.TABLE_NAME);
    if (!sheet) {
      console.log('❌ 错误: 未找到数据表 "' + CONFIG.TABLE_NAME + '"');
      console.log('请修改 CONFIG.TABLE_NAME 为实际的表格名称');
      return;
    }
    console.log('✓ 成功连接到数据表: ' + CONFIG.TABLE_NAME);
    
    // 2. 构建 API URL
    var apiUrl = CONFIG.API_BASE_URL + '/api/digest/latest?userId=' + encodeURIComponent(CONFIG.USER_ID) + '&apiKey=' + CONFIG.API_KEY + '&days=1';
    console.log('✓ API 地址: ' + apiUrl);
    
    // 3. 调用 API 获取数据
    console.log('正在获取数据...');
    
    var response = fetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    // 等待响应
    response.then(function(res) {
      return res.json();
    }).then(function(result) {
      
      // 4. 检查响应
      if (!result.success) {
        console.log('❌ API 返回错误: ' + (result.error || '未知错误'));
        return;
      }
      
      if (!result.data.items || result.data.items.length === 0) {
        console.log('⚠️  暂无新数据');
        console.log('可能原因：');
        console.log('  1. 还没有订阅 RSS 源');
        console.log('  2. 今天还没有生成简报');
        console.log('  3. 数据已经导入过了');
        return;
      }
      
      console.log('✓ 成功获取数据，共 ' + result.data.items.length + ' 条');
      
      // 5. 导入数据
      var successCount = 0;
      var skipCount = 0;
      var errorCount = 0;
      
      var existingRecords = sheet.Records;
      
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
          
        } catch (error) {
          errorCount++;
          console.log('✗ 导入失败: ' + item.title + ' - ' + error);
        }
      }
      
      // 6. 输出结果
      console.log('========================================');
      console.log('导入完成！');
      console.log('成功: ' + successCount + ' 条');
      console.log('跳过: ' + skipCount + ' 条（重复）');
      console.log('失败: ' + errorCount + ' 条');
      console.log('========================================');
      
    }).catch(function(error) {
      console.log('❌ 请求失败: ' + error);
      console.log('');
      console.log('可能原因：');
      console.log('  1. WPS AirScript 不支持 fetch API');
      console.log('  2. 网络连接问题');
      console.log('  3. API 地址不正确');
      console.log('');
      console.log('建议：');
      console.log('  - 改用系统主动推送的方式');
      console.log('  - 或使用 WPS 提供的其他网络请求方法');
    });
    
  } catch (error) {
    console.log('❌ 脚本执行错误: ' + error);
  }
}

// 自动执行主函数
main();
