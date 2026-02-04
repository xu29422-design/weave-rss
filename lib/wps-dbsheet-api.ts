/**
 * WPS 多维表格 (DBSheet) API 客户端
 * 文档：https://open.wps.cn/docs/server/api-doc
 */

interface WPSAccessTokenResponse {
  access_token: string;
  expires_in: number;
}

interface WPSDBSheetRecord {
  [key: string]: any;
}

/**
 * 获取 WPS 访问令牌
 */
export async function getWPSAccessToken(
  appId: string,
  appSecret: string
): Promise<string> {
  try {
    const response = await fetch('https://open.wps.cn/api/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appid: appId,
        secret: appSecret,
        grant_type: 'client_credential'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`获取访问令牌失败: ${response.status} - ${errorText}`);
    }

    const data: WPSAccessTokenResponse = await response.json();
    return data.access_token;
  } catch (error: any) {
    console.error('获取 WPS 访问令牌错误:', error);
    throw error;
  }
}

/**
 * 获取第一个数据表的 ID
 */
export async function getFirstWPSDBSheetId(
  appId: string,
  appSecret: string,
  fileToken: string
): Promise<string | null> {
  try {
    const accessToken = await getWPSAccessToken(appId, appSecret);
    
    // 获取文件的所有数据表
    const response = await fetch(
      `https://open.wps.cn/api/v1/dbsheet/${fileToken}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`获取数据表列表失败: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (data.tables && data.tables.length > 0) {
      return data.tables[0].table_id;
    }
    
    return null;
  } catch (error: any) {
    console.error('获取第一个数据表 ID 错误:', error);
    return null;
  }
}

/**
 * 向 WPS 多维表格添加单条记录
 */
export async function createWPSDBSheetRecord(
  appId: string,
  appSecret: string,
  fileToken: string,
  tableId: string,
  record: WPSDBSheetRecord
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    const accessToken = await getWPSAccessToken(appId, appSecret);
    
    const response = await fetch(
      `https://open.wps.cn/api/v1/dbsheet/${fileToken}/tables/${tableId}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: record
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `添加记录失败: ${response.status} - ${errorText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      recordId: data.record_id
    };
  } catch (error: any) {
    console.error('添加 WPS 多维表格记录错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 批量添加记录
 */
export async function createWPSDBSheetRecords(
  appId: string,
  appSecret: string,
  fileToken: string,
  tableId: string,
  records: WPSDBSheetRecord[]
): Promise<{ success: boolean; successCount: number; errorCount: number; error?: string }> {
  let successCount = 0;
  let errorCount = 0;

  for (const record of records) {
    const result = await createWPSDBSheetRecord(appId, appSecret, fileToken, tableId, record);
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
      console.error('添加记录失败:', result.error);
    }
  }

  return {
    success: errorCount === 0,
    successCount,
    errorCount
  };
}

/**
 * 推送简报数据到 WPS 多维表格
 */
export async function pushDigestToWPSDBSheet(
  appId: string,
  appSecret: string,
  fileToken: string,
  tableId: string,
  digestData: {
    date: string;
    tldr?: string;
    categories: Array<{ name: string; content: string }>;
    totalItems: number;
    reportContent: string;
  }
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    console.log('开始推送简报到 WPS 多维表格...');
    console.log('文件 Token:', fileToken);
    console.log('数据表 ID:', tableId);
    
    // 准备记录数据
    const record: WPSDBSheetRecord = {
      '日期': digestData.date,
      '简报摘要': digestData.tldr || '',
      '文章数量': digestData.totalItems,
      '完整内容': digestData.reportContent,
      '导入时间': new Date().toISOString()
    };

    // 添加分类信息
    digestData.categories.forEach((cat, index) => {
      record[`分类${index + 1}`] = cat.name;
      record[`内容${index + 1}`] = cat.content;
    });

    // 创建记录
    const result = await createWPSDBSheetRecord(
      appId,
      appSecret,
      fileToken,
      tableId,
      record
    );

    if (result.success) {
      console.log('✅ 成功推送到 WPS 多维表格，记录 ID:', result.recordId);
    } else {
      console.error('❌ 推送失败:', result.error);
    }

    return result;
  } catch (error: any) {
    console.error('推送简报到 WPS 多维表格错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
