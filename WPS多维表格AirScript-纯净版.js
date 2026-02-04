// WPS AirScript - RSS自动导入
// 用户: 1159370261@qq.com
// 重要: 请先在工具栏-服务中添加"网络API"服务

var CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  USER_ID: '1159370261@qq.com',
  API_KEY: 'wps_1770173096274_b4pz5s',
  TABLE_NAME: 'Sheet1'
};

function main() {
  console.log('开始导入RSS简报数据');
  console.log('时间: ' + new Date().toLocaleString());
  
  try {
    var sheet = Application.Sheets(CONFIG.TABLE_NAME);
    if (!sheet) {
      console.log('错误: 未找到数据表');
      return;
    }
    console.log('成功连接到数据表');
    
    var apiUrl = CONFIG.API_BASE_URL + '/api/digest/latest?userId=' + encodeURIComponent(CONFIG.USER_ID) + '&apiKey=' + CONFIG.API_KEY + '&days=1';
    console.log('API地址: ' + apiUrl);
    
    console.log('正在获取数据...');
    var response = HTTP.get(apiUrl, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      console.log('API请求失败');
      console.log('状态码: ' + response.status);
      return;
    }
    console.log('成功获取响应');
    
    var result = response.json();
    
    if (!result.success) {
      console.log('API返回错误: ' + (result.error || '未知错误'));
      return;
    }
    
    if (!result.data.items || result.data.items.length === 0) {
      console.log('暂无新数据');
      return;
    }
    
    console.log('成功解析数据，共 ' + result.data.items.length + ' 条');
    
    var successCount = 0;
    var skipCount = 0;
    var errorCount = 0;
    
    var existingRecords = sheet.Records;
    console.log('当前表格已有 ' + existingRecords.length + ' 条记录');
    
    for (var i = 0; i < result.data.items.length; i++) {
      var item = result.data.items[i];
      
      try {
        var isDuplicate = false;
        for (var j = 0; j < existingRecords.length; j++) {
          if (existingRecords[j]['标题'] === item.title) {
            isDuplicate = true;
            break;
          }
        }
        
        if (isDuplicate) {
          skipCount++;
          console.log('跳过重复: ' + item.title);
          continue;
        }
        
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
        console.log('导入成功: ' + item.title);
        
      } catch (error) {
        errorCount++;
        console.log('导入失败: ' + item.title);
        console.log('错误: ' + error);
      }
    }
    
    console.log('========================================');
    console.log('导入完成！');
    console.log('成功: ' + successCount + ' 条');
    console.log('跳过: ' + skipCount + ' 条');
    console.log('失败: ' + errorCount + ' 条');
    console.log('========================================');
    
  } catch (error) {
    console.log('脚本执行错误: ' + error);
    console.log('请检查:');
    console.log('1. 是否添加了网络API服务');
    console.log('2. API地址是否正确');
    console.log('3. 表格名称是否正确');
    console.log('4. 表格字段是否完整');
  }
}

main();
