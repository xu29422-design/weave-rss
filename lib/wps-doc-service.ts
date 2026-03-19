import crypto from "crypto";

const WPS_ACCESS_KEY = process.env.WPS_ACCESS_KEY || "";
const WPS_SECRET_KEY = process.env.WPS_SECRET_KEY || "";
const WPS_API_DOMAIN = process.env.WPS_API_DOMAIN || "https://openapi.wps.cn";
const WPS_DRIVE_ID = process.env.WPS_DRIVE_ID || "";
const WPS_PARENT_ID = process.env.WPS_PARENT_ID || "0";

class WpsDocClient {
  private accessToken: string | null = null;

  private kso1Sign(
    method: string,
    uri: string,
    contentType: string,
    requestBody?: string
  ): Record<string, string> {
    const ksoDate = new Date().toUTCString();

    let sha256Hex = "";
    if (requestBody) {
      sha256Hex = crypto.createHash("sha256").update(requestBody, "utf-8").digest("hex");
    }

    const signatureString = `KSO-1${method}${uri}${contentType}${ksoDate}${sha256Hex}`;
    const ksoSignature = crypto
      .createHmac("sha256", WPS_SECRET_KEY)
      .update(signatureString, "utf-8")
      .digest("hex");

    const headers: Record<string, string> = {
      "X-Kso-Date": ksoDate,
      "Content-Type": contentType,
      "X-Kso-Authorization": `KSO-1 ${WPS_ACCESS_KEY}:${ksoSignature}`,
    };

    if (this.accessToken && !uri.endsWith("/oauth2/token")) {
      headers["Authorization"] = "Bearer " + this.accessToken;
    }

    return headers;
  }

  async getToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const uri = "/oauth2/token";
    const url = WPS_API_DOMAIN + uri;
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: WPS_ACCESS_KEY,
      client_secret: WPS_SECRET_KEY,
    });
    const body = params.toString();
    const headers = this.kso1Sign("POST", uri, "application/x-www-form-urlencoded", body);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WPS getToken failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    this.accessToken = json.access_token;
    return this.accessToken!;
  }

  async createFile(name: string): Promise<string> {
    await this.getToken();

    if (!WPS_DRIVE_ID) throw new Error("WPS_DRIVE_ID is not configured");

    const safeName = name.replace(/[\/\\:*?"<>|]/g, "-").trim();
    const fileName = safeName.endsWith(".otl") ? safeName : safeName + ".otl";
    const uri = `/v7/drives/${WPS_DRIVE_ID}/files/${WPS_PARENT_ID}/create`;
    const url = WPS_API_DOMAIN + uri;
    const bodyObj = {
      file_type: "file",
      name: fileName,
      on_name_conflict: "rename",
    };
    const bodyStr = JSON.stringify(bodyObj);
    const headers = this.kso1Sign("POST", uri, "application/json", bodyStr);

    console.log(`[WPS] createFile request: url=${url}, body=${bodyStr}`);
    const res = await fetch(url, { method: "POST", headers, body: bodyStr });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WPS createFile failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    console.log(`[WPS] createFile response:`, JSON.stringify(json));
    const fileId = json?.data?.id;
    if (!fileId) throw new Error(`WPS createFile: no file id in response: ${JSON.stringify(json)}`);
    return fileId;
  }

  async convertMarkdownToBlocks(fileId: string, markdown: string): Promise<any> {
    await this.getToken();

    const uri = `/v7/airpage/${fileId}/blocks/convert`;
    const url = WPS_API_DOMAIN + uri;
    const argData = { format: "markdown", content: markdown };
    const argBase64 = Buffer.from(JSON.stringify(argData), "utf-8").toString("base64");
    const bodyObj = { arg: argBase64 };
    const bodyStr = JSON.stringify(bodyObj);
    const headers = this.kso1Sign("POST", uri, "application/json", bodyStr);

    const res = await fetch(url, { method: "POST", headers, body: bodyStr });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WPS convertMarkdown failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    if (json?.data?.result) {
      const resultBytes = Buffer.from(json.data.result, "base64");
      return JSON.parse(resultBytes.toString("utf-8"));
    }
    throw new Error(`WPS convertMarkdown: unexpected response: ${JSON.stringify(json)}`);
  }

  async insertBlocks(fileId: string, blocks: any, index = 1, blockId = "doc"): Promise<any> {
    await this.getToken();

    const uri = `/v7/airpage/${fileId}/blocks/create`;
    const url = WPS_API_DOMAIN + uri;
    const argData = { blockId, index, content: blocks };
    const argBase64 = Buffer.from(JSON.stringify(argData), "utf-8").toString("base64");
    const bodyObj = { arg: argBase64 };
    const bodyStr = JSON.stringify(bodyObj);
    const headers = this.kso1Sign("POST", uri, "application/json", bodyStr);

    const res = await fetch(url, { method: "POST", headers, body: bodyStr });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WPS insertBlocks failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  async getBlocks(fileId: string, blockId = "doc"): Promise<any> {
    await this.getToken();

    const uri = `/v7/airpage/${fileId}/blocks`;
    const url = WPS_API_DOMAIN + uri;
    const argData = { blockId };
    const argBase64 = Buffer.from(JSON.stringify(argData), "utf-8").toString("base64");
    const bodyObj = { arg: argBase64 };
    const bodyStr = JSON.stringify(bodyObj);
    const headers = this.kso1Sign("POST", uri, "application/json", bodyStr);

    const res = await fetch(url, { method: "POST", headers, body: bodyStr });
    if (!res.ok) return null;

    const json = await res.json();
    if (json?.data?.result) {
      const resultBytes = Buffer.from(json.data.result, "base64");
      return JSON.parse(resultBytes.toString("utf-8"));
    }
    return null;
  }

  async updateTitle(fileId: string, newTitle: string): Promise<boolean> {
    await this.getToken();

    const blocksData = await this.getBlocks(fileId);
    if (!blocksData?.blocks) return false;

    const findTitleId = (blocks: any[]): string | null => {
      for (const block of blocks) {
        if (block?.type === "title") return block.id;
        if (Array.isArray(block?.content)) {
          const found = findTitleId(block.content);
          if (found) return found;
        }
      }
      return null;
    };

    const titleId = findTitleId(blocksData.blocks);
    if (!titleId) return false;

    const updateContent = [{ type: "text", attrs: { align: 2 }, content: newTitle }];
    const result = await this.insertBlocks(fileId, updateContent, 0, titleId);
    return result != null;
  }

  async openShare(fileId: string): Promise<string> {
    await this.getToken();

    const uri = `/v7/drives/${WPS_DRIVE_ID}/files/${fileId}/open_link`;
    const url = WPS_API_DOMAIN + uri;
    const bodyObj = {
      opts: {
        allow_perm_apply: true,
        close_after_expire: true,
        expire_period: 0,
        expire_time: 0,
      },
      role_id: "12",
      scope: "anyone",
    };
    const bodyStr = JSON.stringify(bodyObj);
    const headers = this.kso1Sign("POST", uri, "application/json", bodyStr);

    const res = await fetch(url, { method: "POST", headers, body: bodyStr });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WPS openShare failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const shareUrl = json?.data?.url || json?.data?.link;
    if (!shareUrl) {
      console.warn("[WPS] openShare response has no url, returning fallback URL", JSON.stringify(json));
      return `https://www.kdocs.cn/p/${fileId}`;
    }
    return shareUrl;
  }
}

/**
 * Publish a Markdown digest to a WPS smart document (.otl).
 * Returns the share URL, or null if WPS credentials are not configured.
 */
export async function publishDigestToDoc(
  title: string,
  markdownContent: string
): Promise<string | null> {
  if (!WPS_ACCESS_KEY || !WPS_SECRET_KEY || !WPS_DRIVE_ID) {
    console.warn("[WPS] Credentials not configured, skipping doc publish");
    return null;
  }

  const client = new WpsDocClient();

  const fileId = await client.createFile(title);
  console.log(`[WPS] Created doc: ${fileId}`);

  await client.updateTitle(fileId, title);
  console.log(`[WPS] Updated title: ${title}`);

  const blocks = await client.convertMarkdownToBlocks(fileId, markdownContent);
  console.log(`[WPS] Converted markdown to blocks`);

  const blockContent = blocks?.blocks || blocks?.content || blocks;
  const contentToInsert = Array.isArray(blockContent) ? blockContent : [blockContent];

  await client.insertBlocks(fileId, contentToInsert);
  console.log(`[WPS] Inserted blocks into doc`);

  const shareUrl = await client.openShare(fileId);
  console.log(`[WPS] Share URL: ${shareUrl}`);

  return shareUrl;
}
