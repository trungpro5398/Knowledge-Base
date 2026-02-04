// Common API response wrapper
export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Space types
export interface Space {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

// Page types
export interface PageNode {
  id: string;
  title: string;
  slug: string;
  path: string;
  parent_id: string | null;
  status: "draft" | "published" | "archived";
  children?: PageNode[];
}

export interface Page {
  id: string;
  space_id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  path: string;
  status: "draft" | "published" | "archived";
  published_version_id: string | null;
  created_at: string;
  updated_at: string;
  version?: PageVersion | null;
}

export interface PageVersion {
  id: string;
  page_id: string;
  content_md: string | null;
  content_json: Record<string, unknown> | null;
  summary: string | null;
  created_at: string;
  created_by: string;
}

export interface PageTemplate {
  id: string;
  space_id: string;
  name: string;
  content_md: string | null;
  created_at: string;
}

// Search types
export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  path: string;
  space_id: string;
  space_name: string;
  snippet?: string;
}

// Trash types
export interface TrashItem {
  page_id: string;
  title: string;
  path: string;
  space_id: string;
  deleted_at: string;
  deleted_by: string;
}

// Comment types
export interface Comment {
  id: string;
  page_id: string;
  content: string;
  author_id: string;
  parent_id: string | null;
  created_at: string;
}
