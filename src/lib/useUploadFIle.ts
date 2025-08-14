import { useState, useRef } from "react";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask,
  UploadMetadata,
} from "firebase/storage";

/**
 * basePath 例:
 *   `videos/public/${SITE_KEY}` ← ここに mp4 を置けば Functions が自動でHLS変換
 */
type UploadOptions = {
  /** 固定ファイル名を使いたい場合（例: "homeBackground.mp4"） */
  filename?: string;
  /** 省略時は自動で contentType を付与。cacheControl など任意で追加可能 */
  metadata?: UploadMetadata;
};

export function useUploadFile(basePath: string) {
  const [progress, setProgress] = useState<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const taskRef = useRef<UploadTask | null>(null);

  const upload = (file: File, opts: UploadOptions = {}): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const storage = getStorage();

      // ファイル名：指定がなければタイムスタンプ付きで衝突回避
      const name = opts.filename ?? `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `${basePath}/${name}`);

      // メタデータ：contentType は自動付与（必要に応じて cacheControl など追加）
      const metadata: UploadMetadata = {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public,max-age=3600,immutable",
        ...(opts.metadata ?? {}),
      };

      const task = uploadBytesResumable(storageRef, file, metadata);
      taskRef.current = task;
      setProgress(0);

      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setProgress(pct);
        },
        (err) => {
          setProgress(null);
          taskRef.current = null;
          reject(err);
        },
        async () => {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          setUrl(downloadURL);
          setProgress(null);
          taskRef.current = null;
          resolve(downloadURL);
        }
      );
    });
  };

  /** 進行中のアップロードを中断 */
  const abort = () => {
    taskRef.current?.cancel();
    taskRef.current = null;
    setProgress(null);
  };

  /** 状態リセット */
  const reset = () => {
    setProgress(null);
    taskRef.current = null;
    setUrl(null);
  };

  return { progress, url, upload, abort, reset };
}
