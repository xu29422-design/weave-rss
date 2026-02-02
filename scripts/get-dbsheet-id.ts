/**
 * 获取轻维表 DBSheet ID 的脚本
 */

const FILE_TOKEN = "cq6krGBLXZTU";
const APP_ID = "AK20260202WZVOLZ";
const APP_SECRET = "c095602f29e116bf514922609bcc6104";

async function getAccessToken() {
  const response = await fetch('https://open.kdocs.cn/api/v1/openapi/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: APP_ID,
      client_secret: APP_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`获取访问令牌失败: ${response.status} - ${errorText}`);
  }

  return (await response.json()).access_token;
}

async function getSchema(fileToken: string, accessToken: string) {
  const url = `https://open.kdocs.cn/api/v1/openapi/light-table/files/${fileToken}/schema`;
  
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

async function main() {
  try {
    console.log("🔍 正在获取轻维表 Schema 信息...\n");
    
    const accessToken = await getAccessToken();
    console.log("✅ 获取访问令牌成功\n");
    
    const schema = await getSchema(FILE_TOKEN, accessToken);
    console.log("✅ 获取 Schema 成功\n");
    console.log("📋 Schema 信息:");
    console.log(JSON.stringify(schema, null, 2));
    
    if (schema.dbsheets && schema.dbsheets.length > 0) {
      console.log("\n✅ 找到数据表:");
      schema.dbsheets.forEach((sheet: any, idx: number) => {
        console.log(`   ${idx + 1}. ID: ${sheet.id || sheet.dbsheet_id || '未知'}`);
        console.log(`      名称: ${sheet.name || '未知'}`);
      });
      
      const firstSheetId = schema.dbsheets[0].id || schema.dbsheets[0].dbsheet_id || "";
      if (firstSheetId) {
        console.log(`\n💡 建议使用的 DBSheet ID: ${firstSheetId}`);
      }
    } else {
      console.log("\n⚠️  未找到数据表");
    }
    
  } catch (error: any) {
    console.error("❌ 错误:", error.message);
    console.error(error);
  }
}

main();
