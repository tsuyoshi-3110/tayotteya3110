// functions/index.ts
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as admin from "firebase-admin";
import { Storage } from "@google-cloud/storage";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";
import os from "os";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

/* -------------------------------------------------------------------------- */
/* Global Options                                                             */
/* -------------------------------------------------------------------------- */
setGlobalOptions({
  region: "asia-northeast2",
  memory: "2GiB",
  timeoutSeconds: 540,
});

if (admin.apps.length === 0) admin.initializeApp();
const gcs = new Storage();

/** デフォルトバケット名（例: "<project-id>.appspot.com"） */
const BUCKET: string = admin.storage().bucket().name;

const HLS_DIRNAME = "hls";

/* -------------------------------------------------------------------------- */
/* ffmpeg / ffprobe Path (ESM import)                                         */
/* -------------------------------------------------------------------------- */
const resolvedFfmpegPath = (ffmpegPath as string) ?? "/usr/bin/ffmpeg";
ffmpeg.setFfmpegPath(resolvedFfmpegPath);
try {
  const resolvedFfprobePath =
    (ffprobe as unknown as { path?: string })?.path ?? "/usr/bin/ffprobe";
  ffmpeg.setFfprobePath(resolvedFfprobePath);
} catch {
  // ffprobe が無くても多くのケースで動作します
}

/* -------------------------------------------------------------------------- */
/* Cloud Storage Trigger                                                      */
/* -------------------------------------------------------------------------- */
export const transcodeToHls = onObjectFinalized(
  {
    bucket: BUCKET,
    region: "asia-northeast2",
    memory: "2GiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name ?? "";
    const contentType = object.contentType ?? "";
    const ext = path.extname(filePath).toLowerCase();

    // 動画のみ（.mp4 / .mov）
    if (!contentType.startsWith("video/")) return;
    if (!(ext === ".mp4" || ext === ".mov")) return;

    // hls 配下は無視（再トリガー防止）
    if (filePath.includes(`/${HLS_DIRNAME}/`)) return;

    // フロントから customMetadata.transcode='hls' を付与しているか
    const transcodeFlag = object.metadata?.transcode;
    const allowByMeta = transcodeFlag === "hls";

    /* ------------------------- Path classification ------------------------ */
    // 背景: videos/public/<SITE_KEY>/homeBackground.(mp4|mov)
    const isBackground = /^videos\/public\/[^/]+\/homeBackground\.(mp4|mov)$/i.test(
      filePath
    );

    // 商品: products/public/<SITE_KEY>/<productId>.(mp4|mov)
    const mProduct = filePath.match(
      /^products\/public\/([^/]+)\/([^/.]+)\.(mp4|mov)$/i
    );
    const isProduct = !!mProduct;

    // セクション: videos/public/<SITE_KEY>/sections/<sectionId>.(mp4|mov)
    const mSection = filePath.match(
      /^videos\/public\/([^/]+)\/sections\/([^/.]+)\.(mp4|mov)$/i
    );
    const isSection = !!mSection;

    // About ページ: sitePages/<SITE_KEY>/about/<any>.(mp4|mov)
    const mAbout = filePath.match(
      /^sitePages\/([^/]+)\/about\/[^/]+\.(mp4|mov)$/i
    );
    const isAbout = !!mAbout;

    // 許可: 明示フラグ or 既知の4パターンのみ
    if (!allowByMeta && !(isBackground || isProduct || isSection || isAbout)) {
      return;
    }

    const bucket = gcs.bucket(BUCKET);

    // 一時領域
    const fileName = path.basename(filePath);
    const tmpMp4Path = path.join(os.tmpdir(), fileName);
    const tmpWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), "hls-"));

    try {
      /* ------------------------------ Download ----------------------------- */
      await bucket.file(filePath).download({ destination: tmpMp4Path });
      console.log("✅ downloaded:", tmpMp4Path);

      /* --------------------------- Create poster --------------------------- */
      const posterLocal = path.join(tmpWorkDir, "poster.jpg");
      await runFfmpegPoster(tmpMp4Path, posterLocal);

      /* ------------------------------ Transcode ---------------------------- */
      const renditions: Rendition[] = [
        { name: "720p", width: 1280, height: 720, videoBitrate: "3000k", audioBitrate: "128k" },
        { name: "480p", width:  854, height: 480, videoBitrate: "1600k", audioBitrate: "128k" },
        { name: "360p", width:  640, height: 360, videoBitrate: "1000k", audioBitrate:  "96k"  },
      ];
      for (const r of renditions) {
        await runFfmpegHls(tmpMp4Path, tmpWorkDir, r);
      }

      /* ---------------------- Master playlist (relative) ------------------- */
      const masterLocal = path.join(tmpWorkDir, "master.m3u8");
      fs.writeFileSync(masterLocal, buildMasterPlaylistRelative(renditions));

      /* ------------------------------ Dest dir ----------------------------- */
      let destDir: string;
      if (isBackground) {
        // videos/public/<SITE_KEY>/hls
        destDir = path.join(path.dirname(filePath), HLS_DIRNAME).replace(/\\/g, "/");
      } else if (isProduct && mProduct) {
        const siteKey = mProduct[1];
        const productId = mProduct[2];
        // products/public/<SITE_KEY>/hls/<productId>
        destDir = `products/public/${siteKey}/${HLS_DIRNAME}/${productId}`;
      } else if (isSection && mSection) {
        const siteKey = mSection[1];
        const sectionId = mSection[2];
        // videos/public/<SITE_KEY>/sections/hls/<sectionId>
        destDir = `videos/public/${siteKey}/sections/${HLS_DIRNAME}/${sectionId}`;
      } else if (isAbout && mAbout) {
        const siteKey = mAbout[1];
        // sitePages/<SITE_KEY>/about/hls
        destDir = `sitePages/${siteKey}/about/${HLS_DIRNAME}`;
      } else {
        console.warn("Unknown path. Skip:", filePath);
        return;
      }

      /* -------------------------- Cleanup old HLS -------------------------- */
      try {
        await bucket.deleteFiles({ prefix: destDir + "/" });
      } catch (e) {
        console.warn("cleanup failed:", e);
      }

      /* ---------------------- Upload HLS set (with token) ------------------ */
      const uploaded = await uploadDir(bucket, tmpWorkDir, destDir);

      // master.m3u8 を絶対URL（token付き）で上書き
      const masterDest = `${destDir}/master.m3u8`;
      const masterAbsText = buildMasterPlaylistAbsolute(
        BUCKET,
        destDir,
        renditions,
        uploaded
      );
      await bucket.file(masterDest).save(masterAbsText, {
        metadata: {
          contentType: "application/vnd.apple.mpegurl",
          cacheControl: "public,max-age=60,must-revalidate",
          metadata: { firebaseStorageDownloadTokens: uploaded[masterDest] },
        },
      });
      console.log("✍️ rewrite:", masterDest);

      // variant .m3u8 の .ts 参照も絶対URLに書き換え
      await rewriteAndUploadVariantPlaylists(
        bucket,
        tmpWorkDir,
        destDir,
        BUCKET,
        uploaded
      );

      /* ------------------------------ Public URLs -------------------------- */
      const masterUrl = buildDownloadUrl(BUCKET, masterDest, uploaded);
      const posterUrl = buildDownloadUrl(
        BUCKET,
        `${destDir}/poster.jpg`,
        uploaded
      );

      console.log("✅ master:", masterUrl);

      /* --------------------------- Firestore update ------------------------ */
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (isBackground) {
        const siteKey = extractSiteKey(filePath);
        if (siteKey) {
          await admin
            .firestore()
            .collection("siteSettingsEditable")
            .doc(siteKey)
            .set(
              {
                url: masterUrl,
                type: "video",
                headerPosterUrl: posterUrl,
                videoStatus: "ready",
                updatedAt: now,
              },
              { merge: true }
            );
          console.log(`✅ Background Firestore updated: ${siteKey}`);
        }
      } else if (isProduct && mProduct) {
        const siteKey = mProduct[1];
        const productId = mProduct[2];
        await admin
          .firestore()
          .collection("siteProducts")
          .doc(siteKey)
          .collection("items")
          .doc(productId)
          .set(
            {
              mediaURL: masterUrl,
              mediaType: "video",
              posterURL: posterUrl,
              status: "ready",
              updatedAt: now,
            },
            { merge: true }
          );
        console.log(`✅ Product Firestore updated: ${siteKey}/${productId}`);
      } else if (isSection && mSection) {
        const sectionId = mSection[2];
        await admin
          .firestore()
          .collection("menuSections")
          .doc(sectionId)
          .set(
            {
              mediaUrl: masterUrl,
              mediaType: "video",
              posterURL: posterUrl,
              status: "ready",
              updatedAt: now,
            },
            { merge: true }
          );
        console.log(`✅ Section Firestore updated: ${sectionId}`);
      } else if (isAbout && mAbout) {
        const siteKey = mAbout[1];
        // About ページの定位置に書き戻し
        await admin
          .firestore()
          .collection("sitePages")
          .doc(siteKey)
          .collection("pages")
          .doc("about")
          .set(
            {
              mediaUrl: masterUrl,
              mediaType: "video",
              posterUrl, // 参考: フロントで未使用ならなくてもOK
              status: "ready",
              updatedAt: now,
            },
            { merge: true }
          );
        console.log(`✅ About Firestore updated: ${siteKey}/about`);
      }
    } catch (err) {
      console.error("❌ transcode failed:", err);

      // 失敗時も Firestore に状態を書き込む（product/section/about）
      const now = admin.firestore.FieldValue.serverTimestamp();
      try {
        if (mProduct) {
          const siteKey = mProduct[1];
          const productId = mProduct[2];
          await admin
            .firestore()
            .collection("siteProducts")
            .doc(siteKey)
            .collection("items")
            .doc(productId)
            .set({ status: "error", updatedAt: now }, { merge: true });
        }
        if (mSection) {
          const sectionId = mSection[2];
          await admin
            .firestore()
            .collection("menuSections")
            .doc(sectionId)
            .set({ status: "error", updatedAt: now }, { merge: true });
        }
        if (mAbout) {
          const siteKey = mAbout[1];
          await admin
            .firestore()
            .collection("sitePages")
            .doc(siteKey)
            .collection("pages")
            .doc("about")
            .set({ status: "error", updatedAt: now }, { merge: true });
        }
      } catch {}
    } finally {
      // 一時ファイル削除
      safeUnlink(tmpMp4Path);
      safeRmdir(tmpWorkDir);
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

type Rendition = {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
};

function extractSiteKey(filePath: string): string | null {
  // 期待パス: videos/public/<SITE_KEY>/....*(mp4|mov)
  const parts = filePath.split("/");
  const idx = parts.findIndex((p) => p === "public");
  if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1] || null;
  return null;
}

// 相対版（ローカル一時生成用）
function buildMasterPlaylistRelative(renditions: Rendition[]): string {
  const estBandwidth = (v: string, a: string) => {
    const vk = parseInt(v.replace("k", ""), 10) || 0;
    const ak = parseInt(a.replace("k", ""), 10) || 0;
    return (vk + ak) * 1000;
  };
  const lines = ["#EXTM3U"];
  for (const r of renditions) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${estBandwidth(
        r.videoBitrate,
        r.audioBitrate
      )},RESOLUTION=${r.width}x${r.height}`,
      `${r.name}.m3u8`
    );
  }
  return lines.join("\n") + "\n";
}

// 絶対URL版（Storage ダウンロードURL + token 付き）
function buildMasterPlaylistAbsolute(
  bucketName: string,
  destDir: string,
  renditions: Rendition[],
  tokenMap: UploadedTokenMap
): string {
  const estBandwidth = (v: string, a: string) => {
    const vk = parseInt(v.replace("k", ""), 10) || 0;
    const ak = parseInt(a.replace("k", ""), 10) || 0;
    return (vk + ak) * 1000;
  };
  const lines = ["#EXTM3U"];
  for (const r of renditions) {
    const variantPath = `${destDir}/${r.name}.m3u8`;
    const variantUrl = buildDownloadUrl(bucketName, variantPath, tokenMap);
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${estBandwidth(
        r.videoBitrate,
        r.audioBitrate
      )},RESOLUTION=${r.width}x${r.height}`,
      variantUrl
    );
  }
  return lines.join("\n") + "\n";
}

const toError = (e: unknown): Error =>
  e instanceof Error
    ? e
    : new Error(typeof e === "string" ? e : JSON.stringify(e));

async function runFfmpegPoster(inputPath: string, outJpg: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .frames(1)
      .outputOptions(["-ss 00:00:01"])
      .output(outJpg)
      .on("end", () => resolve())
      .on("error", (e: unknown) => reject(toError(e)))
      .run();
  });
}

async function runFfmpegHls(inputPath: string, outDir: string, r: Rendition): Promise<void> {
  const playlist = path.join(outDir, `${r.name}.m3u8`);
  const segmentPattern = path.join(outDir, `${r.name}_%03d.ts`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      // 無音動画でも安全（音声はオプショナル）
      .outputOptions(["-map 0:v:0", "-map 0:a:0?"])
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset veryfast",
        "-profile:v main",
        "-sc_threshold 0",
        "-max_muxing_queue_size 1024",
        "-g 48", // 例: 30fps 前提で約1.6s
        "-keyint_min 48",
        "-hls_flags independent_segments",
        `-b:v ${r.videoBitrate}`,
        `-b:a ${r.audioBitrate}`,
        "-hls_time 6",
        "-hls_playlist_type vod",
        "-hls_segment_filename",
        segmentPattern,
        `-vf scale=${r.width}:${r.height}:force_original_aspect_ratio=decrease`,
        "-pix_fmt yuv420p",
      ])
      .output(playlist)
      .on("end", () => resolve())
      .on("error", (e: unknown) => reject(toError(e)))
      .run();
  });
}

type UploadedTokenMap = Record<string, string>; // storagePath -> token

async function uploadDir(
  bucket: any,
  localDir: string,
  destDir: string
): Promise<UploadedTokenMap> {
  const tokenMap: UploadedTokenMap = {};
  for (const name of fs.readdirSync(localDir)) {
    const localPath = path.join(localDir, name);
    const destPath = `${destDir}/${name}`;
    const stat = fs.statSync(localPath);
    if (!stat.isFile()) continue;

    const token = uuidv4();

    const contentType = name.endsWith(".m3u8")
      ? "application/vnd.apple.mpegurl"
      : name.endsWith(".ts")
      ? "video/mp2t"
      : name.endsWith(".jpg")
      ? "image/jpeg"
      : undefined;

    const cacheControl = name.endsWith(".m3u8")
      ? "public,max-age=60,must-revalidate"
      : name.endsWith(".ts")
      ? "public,max-age=2592000,immutable"
      : name.endsWith(".jpg")
      ? "public,max-age=604800,immutable"
      : undefined;

    await bucket.upload(localPath, {
      destination: destPath,
      metadata: {
        contentType,
        cacheControl,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    tokenMap[destPath] = token;
    console.log("⬆️ uploaded:", destPath);
  }
  return tokenMap;
}

async function rewriteAndUploadVariantPlaylists(
  bucket: any,
  localDir: string,
  destDir: string,
  bucketName: string,
  tokenMap: UploadedTokenMap
) {
  const names = fs
    .readdirSync(localDir)
    .filter((n) => n.endsWith(".m3u8") && n !== "master.m3u8");

  for (const name of names) {
    const localPath = path.join(localDir, name);
    const raw = fs.readFileSync(localPath, "utf8");

    const rewritten = raw
      .split(/\r?\n/)
      .map((line) => {
        // セグメント参照行だけを書き換え（コメント/空行はそのまま）
        if (!line || line.startsWith("#")) return line;
        if (line.endsWith(".ts")) {
          const objectPath = `${destDir}/${line}`;
          return buildDownloadUrl(bucketName, objectPath, tokenMap);
        }
        return line;
      })
      .join("\n");

    const destPath = `${destDir}/${name}`;
    await bucket.file(destPath).save(rewritten, {
      metadata: {
        contentType: "application/vnd.apple.mpegurl",
        cacheControl: "public,max-age=60,must-revalidate",
        metadata: { firebaseStorageDownloadTokens: tokenMap[destPath] },
      },
    });
    console.log("✍️ rewrite:", destPath);
  }
}

function buildDownloadUrl(
  bucketName: string,
  objectPath: string,
  tokenMap: UploadedTokenMap
): string {
  const token = tokenMap[objectPath];
  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}

function safeUnlink(p: string) {
  try {
    fs.unlinkSync(p);
  } catch {}
}
function safeRmdir(p: string) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {}
}
