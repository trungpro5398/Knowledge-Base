export type PageStatus = "draft" | "published" | "archived";
export type MembershipRole = "viewer" | "editor" | "admin";

export interface Space {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  space_id: string;
  parent_id: string | null;
  slug: string;
  path: string;
  title: string;
  status: PageStatus;
  current_version_id: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  content_md: string | null;
  content_json: Record<string, unknown> | null;
  summary: string | null;
  created_by: string;
  created_at: string;
}

export interface PageWithVersion extends Page {
  current_version?: PageVersion | null;
}

export interface PageTreeNode extends Page {
  children: PageTreeNode[];
}

export interface Membership {
  user_id: string;
  space_id: string;
  role: MembershipRole;
  created_at: string;
}

export interface Attachment {
  id: string;
  page_id: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}
