// app/projects/page.tsx
import ProjectsClient from "@/components/projects/ProjectsClient";
import { seo } from "@/config/site";

export const metadata = seo.page("projects");

export default function ProjectsPage() {
  return <ProjectsClient />;
}
