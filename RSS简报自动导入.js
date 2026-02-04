// ========================================
// RSS 简报自动导入脚本
// 用户: 1159370261@qq.com
// 使用前必须: 工具栏 -> 服务 -> 添加"网络API"
// ========================================

// 配置信息
var API_URL = 'https://www.weaverss.online';
var USER_ID = 'user_1769675261811_pu3kt';
var API_KEY = 'wps_1770192877815_hdwfqa';
var SHEET_NAME = 'sheet1'; // 目标多维表（大小写不敏感）

// 主函数
function main() {
  log('========================================');
  log('RSS 简报自动导入');
  log('时间: ' + formatDateTime(new Date()));
  log('========================================');
  log('');
  
  // 第1步: 连接表格
  log('[1/5] 连接表格...');
  var sheet = getSheet();
  if (!sheet) {
    return;
  }
  log('OK - 表格: ' + sheet.Name);
  log('SheetId: ' + sheet.Id);
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
    var sheet = Application.ActiveSheet || null;
    if (sheet && String(sheet.Name).toLowerCase() !== String(SHEET_NAME).toLowerCase()) {
      log('请先切换到表: ' + SHEET_NAME + ' 再运行');
      log('当前表: ' + sheet.Name);
      return null;
    }
    if (!sheet) {
      log('未获取到多维表');
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
      timeout: 30000,
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
  var safeItems = items || [];

  if (safeItems.length === 0) {
    return { success: 0, skip: 0, error: 0 };
  }

  var records = [];
  for (var i = 0; i < safeItems.length; i++) {
    var item = safeItems[i];
    records.push({
      fields: {
        '标题': item.title || '',
        '内容': item.content || '',
        '摘要': item.summary || '',
        '来源': item.source || '',
        '分类': item.category || '未分类',
        '质量分数': item.quality || 0,
        '发布时间': formatDateTime(item.publishTime),
        '导入时间': formatDateTime(new Date().toISOString())
      }
    });
  }

  try {
    Application.Record.CreateRecords({
      SheetId: sheet.Id,
      Records: records
    });
    success = records.length;
  } catch (e) {
    error = records.length;
    log('写入失败: ' + e);
  }

  return { success: success, skip: skip, error: error };
}

// 检查是否重复
// 日志输出
function log(msg) {
  console.log(msg);
}

function formatDateTime(input) {
  if (!input) return '';
  var d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return pad(d.getFullYear()) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
         ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

// 执行主函数
main();
