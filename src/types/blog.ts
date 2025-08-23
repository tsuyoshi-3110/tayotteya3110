// types/blog.ts
export type BlogMedia = {
  type: "image" | "video";
  url: string;
  path: string;
  width?: number;
  height?: number;
  durationSec?: number; // video only
};

export type BlogPost = {
  id: string;
  title: string;
  body: string;
  media: BlogMedia[];
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  authorUid: string;
};
