// ========================================
// RSS 简报自动导入脚本
// 用户: 1159370261@qq.com
// 使用前必须: 工具栏 -> 服务 -> 添加"网络API"
// ========================================

// 配置信息
var API_URL = 'http://localhost:3000';
var USER_ID = '1159370261@qq.com';
var API_KEY = 'wps_1770173096274_b4pz5s';
var TABLE_NAME = 'Sheet1';

// 主函数
function main() {
  log('========================================');
  log('RSS 简报自动导入');
  log('时间: ' + formatDate(new Date()));
  log('========================================');
  log('');
  
  // 第1步: 连接表格
  log('[1/5] 连接表格...');
  var sheet = getSheet();
  if (!sheet) {
    return;
  }
  log('OK - 表格: ' + TABLE_NAME);
  log('');
  
  // 第2步: 获取数据
  log('[2/5] 请求API...');
  var data = fetchData();
  if (!data) {
    return;
  }
  log('OK - 获取到 ' + data.items.length + ' 条数据');
  log('');
  
  // 第3步: 检查数据
  log('[3/5] 检查数据...');
  if (data.items.length === 0) {
    log('暂无新数据');
    return;
  }
  log('OK - 数据有效');
  log('');
  
  // 第4步: 导入数据
  log('[4/5] 开始导入...');
  var result = importData(sheet, data.items);
  log('');
  
  // 第5步: 显示结果
  log('[5/5] 导入完成');
  log('========================================');
  log('成功: ' + result.success + ' 条');
  log('跳过: ' + result.skip + ' 条 (重复)');
  log('失败: ' + result.error + ' 条');
  log('总计: ' + data.items.length + ' 条');
  log('========================================');
}

// 获取表格
function getSheet() {
  try {
    var sheet = Application.Sheets(TABLE_NAME);
    if (!sheet) {
      log('错误: 未找到表格 "' + TABLE_NAME + '"');
      log('请修改脚本第10行的 TABLE_NAME');
      return null;
    }
    return sheet;
  } catch (e) {
    log('错误: ' + e);
    return null;
  }
}

// 获取数据
function fetchData() {
  try {
    var url = API_URL + '/api/digest/latest';
    url = url + '?userId=' + encodeURIComponent(USER_ID);
    url = url + '&apiKey=' + API_KEY;
    url = url + '&days=1';
    
    log('请求: ' + url);
    
    var resp = HTTP.get(url, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (resp.status !== 200) {
      log('错误: HTTP ' + resp.status + ' - ' + resp.statusText);
      return null;
    }
    
    var result = resp.json();
    
    if (!result.success) {
      log('错误: ' + (result.error || '未知错误'));
      return null;
    }
    
    return result.data;
  } catch (e) {
    log('错误: ' + e);
    log('');
    log('请检查:');
    log('1. 是否添加了"网络API"服务?');
    log('2. 本地服务是否运行? (npm run dev)');
    log('3. API地址是否正确?');
    return null;
  }
}

// 导入数据
function importData(sheet, items) {
  var success = 0;
  var skip = 0;
  var error = 0;
  
  var records = sheet.Records;
  log('表格现有 ' + records.length + ' 条记录');
  log('');
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    
    // 检查重复
    if (isDuplicate(records, item.title)) {
      skip = skip + 1;
      log('- 跳过: ' + item.title);
      continue;
    }
    
    // 添加记录
    try {
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
      success = success + 1;
      log('+ 成功: ' + item.title);
    } catch (e) {
      error = error + 1;
      log('x 失败: ' + item.title);
      log('  原因: ' + e);
    }
  }
  
  return {
    success: success,
    skip: skip,
    error: error
  };
}

// 检查是否重复
function isDuplicate(records, title) {
  for (var i = 0; i < records.length; i++) {
    if (records[i]['标题'] === title) {
      return true;
    }
  }
  return false;
}

// 格式化日期
function formatDate(date) {
  var year = date.getFullYear();
  var month = padZero(date.getMonth() + 1);
  var day = padZero(date.getDate());
  var hour = padZero(date.getHours());
  var minute = padZero(date.getMinutes());
  var second = padZero(date.getSeconds());
  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
}

// 补零
function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

// 日志输出
function log(msg) {
  console.log(msg);
}

// 执行主函数
main();
