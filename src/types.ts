export interface DataRecord {
  id: string;
  link: string;
  all_columns: string[];
  query_count: number;
  is_verified: boolean;
  verify_time: string | null;
}

export interface HistoryRecord {
  id: string;
  query_time: string;
  query_key: string;
  query_result: string | null;
  is_verified: boolean;
}

export interface LoadResult {
  file_count: number;
  record_count: number;
  skipped_files: string[];
}

export interface QueryResult {
  found: boolean;
  record: DataRecord | null;
  is_duplicate: boolean;
  matched_column: number | null;
  multiple_matches: boolean;
}
