"use server";

/**
 * 校验配置表单（RSS 等），返回各模块的校验结果供 config 页使用
 */
export async function testConfigs(
  formData: FormData
): Promise<Record<string, { status: "success" | "error"; message: string }>> {
  const rssUrlsRaw = formData.get("rssUrls");
  const rssUrls = String(rssUrlsRaw ?? "")
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  const results: Record<string, { status: "success" | "error"; message: string }> = {
    basic: { status: "success", message: "已保存" },
    prompts: { status: "success", message: "已保存" },
  };

  if (rssUrls.length === 0) {
    results.rss = { status: "error", message: "请至少添加一个 RSS 订阅源" };
    return results;
  }

  try {
    const urlPattern = /^https?:\/\/[^\s]+$/i;
    const invalid = rssUrls.filter((u) => !urlPattern.test(u));
    if (invalid.length > 0) {
      results.rss = {
        status: "error",
        message: `以下地址格式无效，请使用 http(s) 开头：${invalid.slice(0, 3).join("、")}${invalid.length > 3 ? "…" : ""}`,
      };
      return results;
    }
  } catch {
    results.rss = { status: "error", message: "校验失败" };
    return results;
  }

  results.rss = { status: "success", message: "已保存" };
  return results;
}
