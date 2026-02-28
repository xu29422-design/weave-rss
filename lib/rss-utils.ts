import Parser from "rss-parser";
import { kv } from "@vercel/kv";
import { saveRawRSSItems } from "@/lib/redis";
import { subHours, isAfter } from "date-fns";
import crypto from "crypto";

const parser = new Parser({
  timeout: 15000, // 15秒超时，防止个别源挂起导致 Vercel Serverless 超时
});

export interface RawRSSItem {
  title: string;
  link: string;
  contentSnippet: string;
  pubDate: string;
  sourceName: string;
}

/**
 * 计算两个字符串的余弦相似度（基于字符 n-gram）
 */
function cosineSimilarity(str1: string, str2: string): number {
  const getNGrams = (str: string, n = 2) => {
    const s = str.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
    const grams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) {
      grams.add(s.substring(i, i + n));
    }
    return grams;
  };

  const grams1 = getNGrams(str1);
  const grams2 = getNGrams(str2);
  
  const intersection = new Set(Array.from(grams1).filter(x => grams2.has(x)));
  const union = grams1.size + grams2.size - intersection.size;
  
  return union === 0 ? 0 : intersection.size / Math.sqrt(grams1.size * grams2.size);
}

/**
 * 标题去重：移除高度相似的文章，只保留最新的
 */
function deduplicateByTitle(items: RawRSSItem[], threshold = 0.75): RawRSSItem[] {
  const result: RawRSSItem[] = [];
  
  for (const item of items) {
    let isDuplicate = false;
    
    for (const existing of result) {
      const similarity = cosineSimilarity(item.title, existing.title);
      
      if (similarity > threshold) {
        isDuplicate = true;
        // 如果新文章更新，替换掉旧的
        const itemTime = new Date(item.pubDate).getTime();
        const existingTime = new Date(existing.pubDate).getTime();
        
        if (itemTime > existingTime) {
          const index = result.indexOf(existing);
          result[index] = item;
          console.log(`📰 标题去重: "${existing.title}" 被更新为 "${item.title}" (相似度: ${(similarity * 100).toFixed(0)}%)`);
        }
        break;
      }
    }
    
    if (!isDuplicate) {
      result.push(item);
    }
  }
  
  console.log(`✅ 标题去重: ${items.length} → ${result.length} 篇`);
  return result;
}

/**
 * 清理 HTML 标签，提取纯文本
 */
function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gim, "") // 移除脚本
    .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gim, "")   // 移除样式
    .replace(/<[^>]+>/g, " ")                             // 移除所有标签
    .replace(/&nbsp;/g, " ")                              // 替换常见实体
    .replace(/\s+/g, " ")                                 // 合并空格
    .trim();
}

// 单源安全上限，仅防个别 feed 返回数千条导致超时/内存问题
const SAFE_ITEMS_PER_FEED = 500;
// 全局安全上限，防止单次任务量过大
const SAFE_TOTAL_ITEMS = 2000;

/**
 * 抓取并解析所有 RSS 源，过滤出「过去 24 小时内」发布的条目（不设 50/100 条数限制，仅安全上限）
 */
export async function fetchNewItems(userId: string, urls: string[], superSubKeyword?: string): Promise<RawRSSItem[]> {
  const now = new Date();
  const cutoff24h = subHours(now, 24);

  // 黑名单关键词：过滤掉明显非新闻的内容
  const BLACKLIST = ["推广", "广告", "招聘", "诚聘", "合作", "联系我们", "版权所有", "订阅我们"];

  console.log(`开始抓取 ${urls.length} 个 RSS 源（过去 24 小时，单源上限 ${SAFE_ITEMS_PER_FEED}，总上限 ${SAFE_TOTAL_ITEMS}）...`);

  const feedPromises = urls.map(async (url) => {
    try {
      const feed = await parser.parseURL(url);
      // 不限制条数，只做安全截断，避免单源过大
      const items = feed.items.slice(0, SAFE_ITEMS_PER_FEED).map((item) => {
        const fullContent = item.content || item["content:encoded"] || item.contentSnippet || item.description || "";
        return {
          title: item.title || "无标题",
          link: item.link || "",
          contentSnippet: cleanHtml(fullContent).slice(0, 2000),
          pubDate: item.pubDate || new Date().toISOString(),
          sourceName: feed.title || "未知源",
        };
      });
      return items;
    } catch (error) {
      console.error(`抓取 RSS 失败: ${url}`, error);
      return [];
    }
  });

  const feeds = await Promise.all(feedPromises);
  const flattenedItems = feeds.flat();

  // 1. 黑名单过滤 + 标题长度过滤
  const preFilteredItems = flattenedItems.filter(item => {
    if (item.title.length < 4) return false;
    const hasBlacklistWord = BLACKLIST.some(word => item.title.includes(word));
    if (hasBlacklistWord) return false;
    return true;
  });

  // 2. 超级订阅（白名单）优先级排序
  if (superSubKeyword) {
    preFilteredItems.sort((a, b) => {
      const aHasKeyword = a.title.includes(superSubKeyword) ? 1 : 0;
      const bHasKeyword = b.title.includes(superSubKeyword) ? 1 : 0;
      return bHasKeyword - aHasKeyword;
    });
  }

  // 时间过滤：仅保留过去 24 小时内发布的内容
  const recentItems = preFilteredItems.filter((item) => {
    try {
      return isAfter(new Date(item.pubDate), cutoff24h);
    } catch {
      return false;
    }
  });

  // 安全上限：防止单次任务量过大导致超时/OOM
  const cappedItems = recentItems.slice(0, SAFE_TOTAL_ITEMS);
  if (recentItems.length > SAFE_TOTAL_ITEMS) {
    console.log(`⚠️ 近期条目 ${recentItems.length} 篇，已截断为 ${SAFE_TOTAL_ITEMS} 篇`);
  }

  console.log(`✅ 抓取完成: ${flattenedItems.length} 篇，预过滤后: ${preFilteredItems.length} 篇，过去24h: ${recentItems.length} 篇，安全截断后: ${cappedItems.length} 篇`);

  // 第一层去重：标题语义去重（快速，在内存中完成）
  const titleDedupedItems = deduplicateByTitle(cappedItems, 0.75);

  // 保存原始 RSS 条目（26 小时窗口，独立去重）
  await saveRawRSSItems(
    userId,
    titleDedupedItems.map((item) => ({
      ...item,
      fetchedAt: new Date().toISOString(),
    }))
  );

  // 第二层去重：URL 去重（使用 Pipeline 批量查询优化性能）
  console.log(`开始 URL 去重检查...`);
  const newItems: RawRSSItem[] = [];
  
  if (titleDedupedItems.length > 0) {
    const pipeline = kv.pipeline();
    const itemHashes = titleDedupedItems.map(item => {
      const hash = crypto.createHash("md5").update(item.link || "").digest("hex");
      return { item, redisKey: `user:${userId}:seen:${hash}` };
    });

    // 批量执行 SET NX
    itemHashes.forEach(({ redisKey }) => {
      pipeline.set(redisKey, "1", { nx: true, ex: 60 * 60 * 24 * 7 });
    });

    const results = await pipeline.exec();

    // 根据执行结果筛选真正的新文章
    results.forEach((isNew, index) => {
      if (isNew === "OK" || isNew === 1) { // Redis 返回 OK 或 1 表示设置成功
        newItems.push(itemHashes[index].item);
      }
    });
  }

  console.log(`✅ 最终结果: ${newItems.length} 篇新文章（已排除重复主题和重复 URL）`);
  return newItems;
}
