/**
 * 金山文档轻维表 API 客户端
 * 文档：https://developer.kdocs.cn/server/light-table/
 */

interface KdocsAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface KdocsRecord {
  fields: Record<string, any>;
}

interface KdocsCreateRecordResponse {
  record_id: string;
  fields: Record<string, any>;
}

/**
 * 获取访问令牌
 * 使用 App ID 和 App Secret 获取访问令牌
 */
async function getAccessToken(appId: string, appSecret: string): Promise<string> {
  const response = await fetch('https://open.kdocs.cn/api/v1/openapi/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: appId,
      client_secret: appSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`获取访问令牌失败: ${response.status} - ${errorText}`);
  }

  const data: KdocsAccessToken = await response.json();
  return data.access_token;
}

/**
 * 获取轻维表 Schema 信息
 */
export async function getDBSheetSchema(fileToken: string, accessToken: string, dbSheetId?: string) {
  const url = dbSheetId
    ? `https://open.kdocs.cn/api/v1/openapi/light-table/files/${fileToken}/dbsheets/${dbSheetId}/schema`
    : `https://open.kdocs.cn/api/v1/openapi/light-table/files/${fileToken}/schema`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`获取 Schema 失败: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * 获取第一个可用的 DBSheet ID
 */
export async function getFirstDBSheetId(
  appId: string,
  appSecret: string,
  fileToken: string
): Promise<string | null> {
  try {
    const accessToken = await getAccessToken(appId, appSecret);
    const schema = await getDBSheetSchema(fileToken, accessToken);
    
    if (schema.dbsheets && schema.dbsheets.length > 0) {
      return schema.dbsheets[0].id || schema.dbsheets[0].dbsheet_id || null;
    }
    
    return null;
  } catch (error: any) {
    console.error('获取 DBSheet ID 失败:', error);
    return null;
  }
}

/**
 * 创建记录到轻维表
 */
export async function createKdocsRecord(
  appId: string,
  appSecret: string,
  fileToken: string,
  dbSheetId: string,
  fields: Record<string, any>
): Promise<KdocsCreateRecordResponse> {
  try {
    // 1. 获取访问令牌
    const accessToken = await getAccessToken(appId, appSecret);

    // 2. 创建记录
    const url = `https://open.kdocs.cn/api/v1/openapi/light-table/files/${fileToken}/dbsheets/${dbSheetId}/records`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`创建记录失败: ${response.status} - ${errorText}`);
    }

    const data: KdocsCreateRecordResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('轻维表 API 调用失败:', error);
    throw error;
  }
}

/**
 * 批量创建记录到轻维表
 */
export async function createKdocsRecords(
  appId: string,
  appSecret: string,
  fileToken: string,
  dbSheetId: string,
  records: Array<{ fields: Record<string, any> }>
): Promise<{ record_ids: string[] }> {
  try {
    // 1. 获取访问令牌
    const accessToken = await getAccessToken(appId, appSecret);

    // 2. 批量创建记录（如果 API 支持批量，否则循环调用）
    // 注意：根据 API 文档，可能需要逐个创建或使用批量接口
    const recordIds: string[] = [];
    
    for (const record of records) {
      const url = `https://open.kdocs.cn/api/v1/openapi/light-table/files/${fileToken}/dbsheets/${dbSheetId}/records`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: record.fields,
        }),
      });

      if (response.ok) {
        const data: KdocsCreateRecordResponse = await response.json();
        recordIds.push(data.record_id);
      } else {
        const errorText = await response.text();
        console.error(`创建记录失败: ${response.status} - ${errorText}`);
      }
    }

    return { record_ids: recordIds };
  } catch (error: any) {
    console.error('轻维表批量创建失败:', error);
    throw error;
  }
}

/**
 * 推送简报数据到轻维表
 * 将简报内容格式化为轻维表记录
 */
export async function pushDigestToKdocs(
  appId: string,
  appSecret: string,
  fileToken: string,
  dbSheetId: string,
  digestData: {
    date: string;
    tldr: string;
    categories: Array<{ name: string; content: string }>;
    totalItems: number;
    reportContent: string;
  }
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    // 格式化数据为轻维表字段
    // 假设轻维表有以下字段：日期、今日焦点、分类数量、简报内容
    const fields: Record<string, any> = {
      '日期': digestData.date,
      '今日焦点': digestData.tldr || '',
      '分类数量': digestData.categories.length,
      '文章总数': digestData.totalItems,
      '简报内容': digestData.reportContent.substring(0, 10000), // 限制长度
    };

    // 添加各分类内容（如果字段存在）
    digestData.categories.forEach((cat, idx) => {
      fields[`分类${idx + 1}`] = `${cat.name}: ${cat.content.substring(0, 2000)}`;
    });

    const result = await createKdocsRecord(appId, appSecret, fileToken, dbSheetId, fields);
    
    return {
      success: true,
      recordId: result.record_id,
    };
  } catch (error: any) {
    console.error('推送到轻维表失败:', error);
    return {
      success: false,
      error: error.message || '未知错误',
    };
  }
}
