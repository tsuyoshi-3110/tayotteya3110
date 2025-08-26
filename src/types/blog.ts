// 既存の BlogMedia はそのまま利用する前提
export type BlogMedia = {
  type: "image" | "video";
  url: string;
  path: string;
  alt?: string;
};

export type BlogBlock =
  | { id: string; type: "p"; text: string }
  | ({ id: string } & BlogMedia);

export type BlogPost = {
  id?: string;
  title: string;
  body?: string;           // 後方互換（検索や旧記事表示用のプレーンテキスト）
  media?: BlogMedia[];     // 後方互換（旧仕様）
  blocks?: BlogBlock[];    // 新仕様：本文はこれが主
  createdAt?: any;
  updatedAt?: any;
};
