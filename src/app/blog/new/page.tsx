// app/blog/new/page.tsx
import BlogEditor from "@/components/blog/BlogEditor";

export default function BlogNewPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">新規投稿</h1>
      <BlogEditor />
    </div>
  );
}
