/**
 * 更新用户轻维表配置的脚本
 * 使用方法: npx tsx scripts/update-kdocs-config.ts
 */

import { createKVClient } from "../lib/redis";
import { kv } from "@vercel/kv";

// 配置信息
const FILE_TOKEN = "cq6krGBLXZTU"; // 从 URL http://kdocs.cn/l/cq6krGBLXZTU 中提取
const FILE_ID = "491825957512";
const APP_ID = "AK20260202WZVOLZ";
const APP_SECRET = "c095602f29e116bf514922609bcc6104";
const USERNAME = "1159370261@qq.com";

/**
 * 获取访问令牌
 */
async function getAccessToken(appId: string, appSecret: string): Promise<string> {
  try {
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

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    throw new Error(`获取访问令牌失败: ${error.message}`);
  }
}

/**
 * 获取轻维表 Schema 信息
 */
async function getSchema(fileToken: string, accessToken: string) {
  try {
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
  } catch (error: any) {
    throw new Error(`获取 Schema 失败: ${error.message}`);
  }
}

async function updateKdocsConfig() {
  try {
    console.log("🚀 开始更新轻维表配置...\n");

    // 1. 根据用户名查找用户ID
    const user = await kv.get<any>(`user:username:${USERNAME}`);
    
    if (!user) {
      console.error(`❌ 未找到用户: ${USERNAME}`);
      console.log("请确认用户名是否正确，或者用户是否已注册");
      return;
    }

    const userId = user.id;
    console.log(`✅ 找到用户: ${USERNAME}`);
    console.log(`   UserID: ${userId}\n`);

    // 2. 获取当前配置
    const kvClient = createKVClient();
    if (!kvClient) {
      console.error("❌ KV 客户端未初始化");
      console.log("请检查环境变量 KV_REST_API_URL 和 KV_REST_API_TOKEN");
      return;
    }

    const currentSettings = await kvClient.get<any>(`user:${userId}:settings`);
    console.log("📋 当前配置状态:", currentSettings ? "已存在配置" : "无配置");

    // 3. 尝试获取 DBSheet ID
    let dbSheetId = "";
    try {
      console.log("\n🔍 尝试获取轻维表 Schema 信息...");
      const accessToken = await getAccessToken(APP_ID, APP_SECRET);
      console.log("✅ 获取访问令牌成功");
      
      const schema = await getSchema(FILE_TOKEN, accessToken);
      console.log("✅ 获取 Schema 成功");
      
      // 从 Schema 中提取第一个 DBSheet ID
      if (schema.dbsheets && schema.dbsheets.length > 0) {
        dbSheetId = schema.dbsheets[0].id || schema.dbsheets[0].dbsheet_id || "";
        console.log(`✅ 找到数据表 ID: ${dbSheetId}`);
        console.log(`   数据表名称: ${schema.dbsheets[0].name || '未知'}`);
      } else {
        console.log("⚠️  Schema 中未找到数据表，将使用空值");
        console.log("   您需要手动在轻维表中查看并填写 DBSheet ID");
      }
    } catch (error: any) {
      console.log(`⚠️  获取 Schema 失败: ${error.message}`);
      console.log("   将使用空的 DBSheet ID，您需要手动填写");
      console.log("   或者稍后在配置页面中填写");
    }

    // 4. 更新配置，添加轻维表信息
    const updatedSettings = {
      ...currentSettings,
      kdocsAppId: APP_ID,
      kdocsAppSecret: APP_SECRET,
      kdocsFileToken: FILE_TOKEN,
      kdocsDBSheetId: dbSheetId,
      enableKdocsPush: true,
    };

    await kvClient.set(`user:${userId}:settings`, updatedSettings);
    
    console.log("\n✅ 轻维表配置已更新！");
    console.log("\n📝 配置详情:");
    console.log(`   App ID: ${APP_ID}`);
    console.log(`   App Secret: ${APP_SECRET.substring(0, 8)}...`);
    console.log(`   File Token: ${FILE_TOKEN}`);
    console.log(`   文件 ID: ${FILE_ID}`);
    console.log(`   DBSheet ID: ${dbSheetId || '(需要手动填写)'}`);
    console.log(`   启用推送: true`);

    if (!dbSheetId) {
      console.log("\n⚠️  注意: DBSheet ID 为空，请按以下步骤填写:");
      console.log("   1. 登录 Weave 系统");
      console.log("   2. 进入配置页面");
      console.log("   3. 找到'轻维表推送配置'模块");
      console.log("   4. 填写 DBSheet ID");
      console.log("   5. 保存配置");
    } else {
      console.log("\n🎉 配置完成！系统将在下次推送时同时推送到轻维表。");
    }

  } catch (error: any) {
    console.error("\n❌ 更新配置失败:", error.message);
    console.error(error);
  }
}

// 运行脚本
updateKdocsConfig();
