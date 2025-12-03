use calamine::{open_workbook, Reader, Xlsx, Xls, XlsxError, XlsError};
use encoding_rs::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

// ============ 数据结构 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataRecord {
    pub id: String,           // 第一列作为主键
    pub link: String,         // 第二列作为链接（用于生成二维码）
    pub all_columns: Vec<String>, // 所有列的值
    pub query_count: u32,
    pub is_verified: bool,
    pub verify_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryRecord {
    pub id: String,
    pub query_time: String,
    pub query_key: String,
    pub query_result: Option<String>,
    pub is_verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadResult {
    pub file_count: u32,
    pub record_count: u32,
    pub skipped_files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub found: bool,
    pub record: Option<DataRecord>,
    pub is_duplicate: bool,
    pub matched_column: Option<usize>, // 匹配的列索引（从0开始）
}

// ============ 全局状态 ============

struct AppState {
    data_store: Mutex<HashMap<String, DataRecord>>,      // id -> record
    value_to_id: Mutex<HashMap<String, String>>,         // 任意列的值 -> id
    history_store: Mutex<Vec<HistoryRecord>>,
    duplicate_keys: Mutex<Vec<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            data_store: Mutex::new(HashMap::new()),
            value_to_id: Mutex::new(HashMap::new()),
            history_store: Mutex::new(Vec::new()),
            duplicate_keys: Mutex::new(Vec::new()),
        }
    }
}

// ============ 持久化路径 ============

fn get_data_dir() -> PathBuf {
    let base = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("DataQueryTool")
        .join("Data");
    
    if !base.exists() {
        let _ = fs::create_dir_all(&base);
    }
    
    base
}

fn get_records_file() -> PathBuf {
    get_data_dir().join("records.json")
}

fn get_history_file() -> PathBuf {
    get_data_dir().join("history.json")
}

// ============ 持久化操作 ============

fn save_records(records: &HashMap<String, DataRecord>) {
    if let Ok(json) = serde_json::to_string_pretty(records) {
        let path = get_records_file();
        let _ = fs::write(path, json);
    }
}

fn load_records() -> HashMap<String, DataRecord> {
    let path = get_records_file();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(records) = serde_json::from_str(&content) {
                return records;
            }
        }
    }
    HashMap::new()
}

fn save_history(history: &[HistoryRecord]) {
    if let Ok(json) = serde_json::to_string_pretty(history) {
        let path = get_history_file();
        let _ = fs::write(path, json);
    }
}

fn load_history() -> Vec<HistoryRecord> {
    let path = get_history_file();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(history) = serde_json::from_str(&content) {
                return history;
            }
        }
    }
    Vec::new()
}

// ============ 编码检测和读取 ============

fn read_file_with_encoding(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
    
    // 尝试 UTF-8
    if let Ok(content) = String::from_utf8(buffer.clone()) {
        return Ok(content);
    }
    
    // 尝试 GBK
    let (cow, _, had_errors) = GBK.decode(&buffer);
    if !had_errors {
        return Ok(cow.into_owned());
    }
    
    // 尝试 GB18030
    let (cow, _, _) = GB18030.decode(&buffer);
    Ok(cow.into_owned())
}

// ============ 文件加载 ============

fn load_csv_file(
    path: &Path,
    store: &mut HashMap<String, DataRecord>,
    value_index: &mut HashMap<String, String>,
    duplicates: &mut Vec<String>,
    saved_records: &HashMap<String, DataRecord>,
) -> Result<u32, String> {
    let mut count = 0u32;
    
    let content = read_file_with_encoding(path)?;
    
    let first_line = content.lines().next().unwrap_or("");
    let delimiter = if first_line.contains('\t') {
        b'\t'
    } else if first_line.contains(';') {
        b';'
    } else {
        b','
    };
    
    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .has_headers(true)
        .flexible(true)
        .from_reader(content.as_bytes());

    for result in rdr.records() {
        if let Ok(record) = result {
            if record.len() >= 2 {
                let id = record.get(0).unwrap_or("").trim().to_string();
                let link = record.get(1).unwrap_or("").trim().to_string();
                
                // 收集所有列的值
                let all_columns: Vec<String> = (0..record.len())
                    .map(|i| record.get(i).unwrap_or("").trim().to_string())
                    .collect();
                
                if !id.is_empty() {
                    if store.contains_key(&id) {
                        if !duplicates.contains(&id) {
                            duplicates.push(id.clone());
                        }
                    } else {
                        let (query_count, is_verified, verify_time) = 
                            if let Some(saved) = saved_records.get(&id) {
                                (saved.query_count, saved.is_verified, saved.verify_time.clone())
                            } else {
                                (0, false, None)
                            };
                        
                        // 为所有列的值建立索引
                        for col_value in &all_columns {
                            if !col_value.is_empty() {
                                value_index.insert(col_value.clone(), id.clone());
                            }
                        }
                        
                        store.insert(id.clone(), DataRecord {
                            id,
                            link,
                            all_columns,
                            query_count,
                            is_verified,
                            verify_time,
                        });
                        count += 1;
                    }
                }
            }
        }
    }

    Ok(count)
}

fn load_xlsx_file(
    path: &Path,
    store: &mut HashMap<String, DataRecord>,
    value_index: &mut HashMap<String, String>,
    duplicates: &mut Vec<String>,
    saved_records: &HashMap<String, DataRecord>,
) -> Result<u32, String> {
    let mut count = 0u32;
    
    let mut workbook: Xlsx<_> = open_workbook(path).map_err(|e: XlsxError| e.to_string())?;
    
    if let Some(sheet_name) = workbook.sheet_names().first().cloned() {
        if let Ok(range) = workbook.worksheet_range(&sheet_name) {
            let mut first_row = true;
            for row in range.rows() {
                if first_row {
                    first_row = false;
                    continue;
                }
                
                if row.len() >= 2 {
                    let id = row[0].to_string().trim().to_string();
                    let link = row[1].to_string().trim().to_string();
                    
                    // 收集所有列的值
                    let all_columns: Vec<String> = row.iter()
                        .map(|cell| cell.to_string().trim().to_string())
                        .collect();
                    
                    if !id.is_empty() {
                        if store.contains_key(&id) {
                            if !duplicates.contains(&id) {
                                duplicates.push(id.clone());
                            }
                        } else {
                            let (query_count, is_verified, verify_time) = 
                                if let Some(saved) = saved_records.get(&id) {
                                    (saved.query_count, saved.is_verified, saved.verify_time.clone())
                                } else {
                                    (0, false, None)
                                };
                            
                            // 为所有列的值建立索引
                            for col_value in &all_columns {
                                if !col_value.is_empty() {
                                    value_index.insert(col_value.clone(), id.clone());
                                }
                            }
                            
                            store.insert(id.clone(), DataRecord {
                                id,
                                link,
                                all_columns,
                                query_count,
                                is_verified,
                                verify_time,
                            });
                            count += 1;
                        }
                    }
                }
            }
        }
    }

    Ok(count)
}

fn load_xls_file(
    path: &Path,
    store: &mut HashMap<String, DataRecord>,
    value_index: &mut HashMap<String, String>,
    duplicates: &mut Vec<String>,
    saved_records: &HashMap<String, DataRecord>,
) -> Result<u32, String> {
    let mut count = 0u32;
    
    let mut workbook: Xls<_> = open_workbook(path).map_err(|e: XlsError| e.to_string())?;
    
    if let Some(sheet_name) = workbook.sheet_names().first().cloned() {
        if let Ok(range) = workbook.worksheet_range(&sheet_name) {
            let mut first_row = true;
            for row in range.rows() {
                if first_row {
                    first_row = false;
                    continue;
                }
                
                if row.len() >= 2 {
                    let id = row[0].to_string().trim().to_string();
                    let link = row[1].to_string().trim().to_string();
                    
                    // 收集所有列的值
                    let all_columns: Vec<String> = row.iter()
                        .map(|cell| cell.to_string().trim().to_string())
                        .collect();
                    
                    if !id.is_empty() {
                        if store.contains_key(&id) {
                            if !duplicates.contains(&id) {
                                duplicates.push(id.clone());
                            }
                        } else {
                            let (query_count, is_verified, verify_time) = 
                                if let Some(saved) = saved_records.get(&id) {
                                    (saved.query_count, saved.is_verified, saved.verify_time.clone())
                                } else {
                                    (0, false, None)
                                };
                            
                            // 为所有列的值建立索引
                            for col_value in &all_columns {
                                if !col_value.is_empty() {
                                    value_index.insert(col_value.clone(), id.clone());
                                }
                            }
                            
                            store.insert(id.clone(), DataRecord {
                                id,
                                link,
                                all_columns,
                                query_count,
                                is_verified,
                                verify_time,
                            });
                            count += 1;
                        }
                    }
                }
            }
        }
    }

    Ok(count)
}

// ============ Tauri 命令 ============

#[tauri::command]
fn load_data_folder(folder_path: String, state: tauri::State<AppState>) -> Result<LoadResult, String> {
    let path = Path::new(&folder_path);
    if !path.exists() || !path.is_dir() {
        return Err("文件夹不存在".to_string());
    }

    let mut data_store = state.data_store.lock().unwrap();
    let mut value_index = state.value_to_id.lock().unwrap();
    let mut duplicates = state.duplicate_keys.lock().unwrap();
    
    data_store.clear();
    value_index.clear();
    duplicates.clear();

    let saved_records = load_records();

    let mut file_count = 0u32;
    let mut record_count = 0u32;
    let mut skipped_files = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if let Some(ext) = file_path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                let file_name = file_path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                let result = match ext_str.as_str() {
                    "csv" | "txt" => load_csv_file(&file_path, &mut data_store, &mut value_index, &mut duplicates, &saved_records),
                    "xlsx" => load_xlsx_file(&file_path, &mut data_store, &mut value_index, &mut duplicates, &saved_records),
                    "xls" => load_xls_file(&file_path, &mut data_store, &mut value_index, &mut duplicates, &saved_records),
                    _ => continue,
                };
                
                match result {
                    Ok(count) => {
                        file_count += 1;
                        record_count += count;
                    }
                    Err(_) => {
                        skipped_files.push(format!("{} 文件异常，已跳过", file_name));
                    }
                }
            }
        }
    }

    save_records(&data_store);

    if file_count == 0 {
        return Err("所选文件夹无有效数据文件（支持 CSV、TXT、XLSX、XLS 格式）".to_string());
    }

    Ok(LoadResult {
        file_count,
        record_count,
        skipped_files,
    })
}

#[tauri::command]
fn query_data(query_key: String, state: tauri::State<AppState>) -> QueryResult {
    let mut data_store = state.data_store.lock().unwrap();
    let value_index = state.value_to_id.lock().unwrap();
    let mut history_store = state.history_store.lock().unwrap();
    let duplicates = state.duplicate_keys.lock().unwrap();
    
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let is_duplicate = duplicates.contains(&query_key);
    
    // 通过索引查找匹配的记录ID
    if let Some(id) = value_index.get(&query_key) {
        if let Some(record) = data_store.get_mut(id) {
            record.query_count += 1;
            let record_clone = record.clone();
            
            // 找出匹配的列索引
            let matched_column = record_clone.all_columns.iter()
                .position(|v| v == &query_key);
            
            let history = HistoryRecord {
                id: uuid_simple(),
                query_time: now,
                query_key: query_key.clone(),
                query_result: Some(record_clone.link.clone()),
                is_verified: record_clone.is_verified,
            };
            
            history_store.insert(0, history);
            
            if history_store.len() > 100 {
                history_store.truncate(100);
            }
            
            let store_clone = data_store.clone();
            let history_clone = history_store.clone();
            drop(data_store);
            drop(value_index);
            drop(history_store);
            
            save_records(&store_clone);
            save_history(&history_clone);
            
            return QueryResult {
                found: true,
                record: Some(record_clone),
                is_duplicate,
                matched_column,
            };
        }
    }
    
    // 没找到
    let history = HistoryRecord {
        id: uuid_simple(),
        query_time: now,
        query_key,
        query_result: None,
        is_verified: false,
    };
    
    history_store.insert(0, history);
    
    if history_store.len() > 100 {
        history_store.truncate(100);
    }
    
    let history_clone = history_store.clone();
    drop(data_store);
    drop(value_index);
    drop(history_store);
    
    save_history(&history_clone);
    
    QueryResult {
        found: false,
        record: None,
        is_duplicate: false,
        matched_column: None,
    }
}

#[tauri::command]
fn verify_record(record_id: String, state: tauri::State<AppState>) -> Result<DataRecord, String> {
    let mut data_store = state.data_store.lock().unwrap();
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    if let Some(record) = data_store.get_mut(&record_id) {
        if record.is_verified {
            return Err("该记录已核销，不可重复操作".to_string());
        }
        
        record.is_verified = true;
        record.verify_time = Some(now);
        let record_clone = record.clone();
        
        let store_clone = data_store.clone();
        drop(data_store);
        
        save_records(&store_clone);
        
        Ok(record_clone)
    } else {
        Err("记录不存在".to_string())
    }
}

#[tauri::command]
fn get_history(state: tauri::State<AppState>) -> Vec<HistoryRecord> {
    state.history_store.lock().unwrap().clone()
}

#[tauri::command]
fn clear_history(state: tauri::State<AppState>) {
    let mut history_store = state.history_store.lock().unwrap();
    history_store.clear();
    save_history(&history_store);
}

#[tauri::command]
fn delete_history_item(id: String, state: tauri::State<AppState>) {
    let mut history_store = state.history_store.lock().unwrap();
    history_store.retain(|item| item.id != id);
    save_history(&history_store);
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap();
    format!("{}{}", duration.as_nanos(), duration.subsec_nanos())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let saved_history = load_history();
    
    let app_state = AppState {
        data_store: Mutex::new(HashMap::new()),
        value_to_id: Mutex::new(HashMap::new()),
        history_store: Mutex::new(saved_history),
        duplicate_keys: Mutex::new(Vec::new()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            load_data_folder,
            query_data,
            verify_record,
            get_history,
            clear_history,
            delete_history_item,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
