// ========================================
// RSS 原始数据导入脚本（外网域名版）
// 用户: 1159370261@qq.com
// 使用前必须: 工具栏 -> 服务 -> 添加"网络API"
// ========================================

var API_URL = 'https://www.weaverss.online';
var USER_ID = 'user_1769675261811_pu3kt';
var API_KEY = 'wps_1770192877815_hdwfqa';
var TABLE_NAME = 'Sheet1'; // 原始数据表
var LIMIT = 200; // 每次拉取数量

function main() {
  log('========================================');
  log('RSS 原始数据导入');
  log('时间: ' + formatDate(new Date()));
  log('========================================');
  log('');

  log('[1/4] 连接表格...');
  var sheet = getSheet();
  if (!sheet) return;
  log('OK - 表格: ' + TABLE_NAME);
  log('');

  log('[2/4] 请求API...');
  var data = fetchData();
  if (!data) return;
  log('OK - 获取到 ' + data.items.length + ' 条数据');
  log('');

  log('[3/4] 开始导入...');
  var result = importData(sheet, data.items);
  log('');

  log('[4/4] 导入完成');
  log('========================================');
  log('成功: ' + result.success + ' 条');
  log('跳过: ' + result.skip + ' 条 (重复)');
  log('失败: ' + result.error + ' 条');
  log('总计: ' + data.items.length + ' 条');
  log('========================================');
}

function getSheet() {
  try {
    var sheet = Application.Sheets(TABLE_NAME);
    if (!sheet) {
      log('错误: 未找到表格 "' + TABLE_NAME + '"');
      log('请修改脚本里的 TABLE_NAME');
      return null;
    }
    return sheet;
  } catch (e) {
    log('错误: ' + e);
    return null;
  }
}

function fetchData() {
  try {
    var url = API_URL + '/api/rss/raw';
    url = url + '?userId=' + encodeURIComponent(USER_ID);
    url = url + '&apiKey=' + API_KEY;
    url = url + '&limit=' + LIMIT;

    log('请求: ' + url);

    var resp = HTTP.get(url, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
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
    log('请检查是否已添加“网络API”服务');
    return null;
  }
}

function importData(sheet, items) {
  var success = 0;
  var skip = 0;
  var error = 0;

  var records = sheet.Records || [];
  log('表格现有 ' + records.length + ' 条记录');
  log('');

  var safeItems = items || [];
  for (var i = 0; i < safeItems.length; i++) {
    var item = safeItems[i];

    if (isDuplicate(records, item.link, item.title)) {
      skip = skip + 1;
      log('- 跳过: ' + item.title);
      continue;
    }

    try {
      addRecord(sheet, {
        '标题': item.title || '',
        '内容': item.contentSnippet || '',
        '来源': item.link || '',
        '来源名称': item.sourceName || '',
        '发布时间': item.pubDate || '',
        '抓取时间': item.fetchedAt || ''
      });
      success = success + 1;
      log('+ 成功: ' + item.title);
    } catch (e) {
      error = error + 1;
      log('x 失败: ' + item.title);
      log('  原因: ' + e);
    }
  }

  return { success: success, skip: skip, error: error };
}

function isDuplicate(records, link, title) {
  for (var i = 0; i < records.length; i++) {
    if (link && records[i]['来源'] === link) return true;
    if (!link && title && records[i]['标题'] === title) return true;
  }
  return false;
}

function formatDate(date) {
  var y = date.getFullYear();
  var m = padZero(date.getMonth() + 1);
  var d = padZero(date.getDate());
  var h = padZero(date.getHours());
  var mi = padZero(date.getMinutes());
  var s = padZero(date.getSeconds());
  return y + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + s;
}

function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

function log(msg) {
  console.log(msg);
}

function addRecord(sheet, record) {
  if (sheet && typeof sheet.AddRecord === 'function') {
    return sheet.AddRecord(record);
  }
  if (sheet && sheet.Records && typeof sheet.Records.Add === 'function') {
    return sheet.Records.Add(record);
  }
  if (Application && Application.ActiveSheet && typeof Application.ActiveSheet.AddRecord === 'function') {
    return Application.ActiveSheet.AddRecord(record);
  }
  throw new Error('当前表对象不支持 AddRecord');
}

main();
