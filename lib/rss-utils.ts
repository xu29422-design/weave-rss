import Parser from "rss-parser";
import { kv } from "@vercel/kv";
import { saveRawRSSItems } from "@/lib/redis";
import { subDays, isAfter } from "date-fns";
import crypto from "crypto";

const parser = new Parser();

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

/**
 * 抓取并解析所有 RSS 源，过滤出近期的增量条目
 */
export async function fetchNewItems(userId: string, urls: string[], superSubKeyword?: string): Promise<RawRSSItem[]> {
  // 修改为只抓取 24 小时内的内容，节省 Token
  const oneDayAgo = subDays(new Date(), 1);
  const MAX_ITEMS_PER_FEED = 50; // 恢复单源抓取上限，确保覆盖面
  const MAX_TOTAL_ITEMS = 100;  // 总量限制在 100 篇

  // 黑名单关键词：过滤掉明显非新闻的内容
  const BLACKLIST = ["推广", "广告", "招聘", "诚聘", "合作", "联系我们", "版权所有", "订阅我们"];

  console.log(`开始抓取 ${urls.length} 个 RSS 源...`);

  const feedPromises = urls.map(async (url) => {
    try {
      const feed = await parser.parseURL(url);
      const limitedItems = feed.items.slice(0, MAX_ITEMS_PER_FEED).map((item) => {
        const fullContent = item.content || item["content:encoded"] || item.contentSnippet || item.description || "";
        return {
          title: item.title || "无标题",
          link: item.link || "",
          contentSnippet: cleanHtml(fullContent).slice(0, 2000),
          pubDate: item.pubDate || new Date().toISOString(),
          sourceName: feed.title || "未知源",
        };
      });
      return limitedItems;
    } catch (error) {
      console.error(`抓取 RSS 失败: ${url}`, error);
      return [];
    }
  });

  const feeds = await Promise.all(feedPromises);
  const flattenedItems = feeds.flat();

  // 1. 黑名单过滤 + 标题长度过滤
  const preFilteredItems = flattenedItems.filter(item => {
    // 标题太短（小于 4 个字）通常没有实质内容
    if (item.title.length < 4) return false;
    
    // 黑名单匹配
    const hasBlacklistWord = BLACKLIST.some(word => item.title.includes(word));
    if (hasBlacklistWord) return false;

    return true;
  });

  // 2. 超级订阅（白名单）优先级排序
  // 如果标题包含用户最想看的主题关键词，排到最前面
  if (superSubKeyword) {
    preFilteredItems.sort((a, b) => {
      const aHasKeyword = a.title.includes(superSubKeyword) ? 1 : 0;
      const bHasKeyword = b.title.includes(superSubKeyword) ? 1 : 0;
      return bHasKeyword - aHasKeyword;
    });
  }

  const cappedItems = preFilteredItems.slice(0, MAX_TOTAL_ITEMS);

  console.log(`✅ 抓取完成: ${flattenedItems.length} 篇，预过滤后: ${preFilteredItems.length} 篇，限流后: ${cappedItems.length} 篇`);

  // 时间过滤
  const recentItems = cappedItems.filter((item) => {
    try {
      return isAfter(new Date(item.pubDate), oneDayAgo);
    } catch {
      return false;
    }
  });

  console.log(`✅ 时间过滤: ${recentItems.length} 篇`);

  // 第一层去重：标题语义去重（快速，在内存中完成）
  const titleDedupedItems = deduplicateByTitle(recentItems, 0.75);

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

  // 保存原始 RSS 条目（26 小时窗口）
  await saveRawRSSItems(
    userId,
    newItems.map((item) => ({
      ...item,
      fetchedAt: new Date().toISOString(),
    }))
  );
  return newItems;
}
