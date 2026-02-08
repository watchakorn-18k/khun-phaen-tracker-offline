use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

/// Lamport Timestamp for ordering
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct LamportTimestamp {
    pub counter: u64,
    pub node_id: String,
}

impl LamportTimestamp {
    pub fn new(counter: u64, node_id: &str) -> Self {
        Self {
            counter,
            node_id: node_id.to_string(),
        }
    }
    
    pub fn increment(&mut self) {
        self.counter += 1;
    }
}

/// CRDT Operation for tasks
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Operation {
    Insert {
        task_id: u32,
        field: String,
        value: String,
        timestamp: LamportTimestamp,
    },
    Update {
        task_id: u32,
        field: String,
        value: String,
        timestamp: LamportTimestamp,
    },
    Delete {
        task_id: u32,
        timestamp: LamportTimestamp,
    },
}

/// CRDT Document for a Task
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CrdtTask {
    pub id: u32,
    pub fields: HashMap<String, CrdtValue>,
    pub deleted: bool,
    pub created_at: LamportTimestamp,
    pub updated_at: LamportTimestamp,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CrdtValue {
    pub value: String,
    pub timestamp: LamportTimestamp,
}

/// CRDT Document Store
#[wasm_bindgen]
pub struct CrdtDocument {
    node_id: String,
    counter: u64,
    tasks: HashMap<u32, CrdtTask>,
    operations: Vec<Operation>,
}

#[wasm_bindgen]
impl CrdtDocument {
    #[wasm_bindgen(constructor)]
    pub fn new(node_id: String) -> Self {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();
        
        console_log!("CRDT Document created for node: {}", node_id);
        
        Self {
            node_id,
            counter: 0,
            tasks: HashMap::new(),
            operations: Vec::new(),
        }
    }
    
    fn new_timestamp(&mut self) -> LamportTimestamp {
        self.counter += 1;
        LamportTimestamp::new(self.counter, &self.node_id)
    }
    
    /// Insert or update a task field
    pub fn upsert_field(&mut self, task_id: u32, field: String, value: String) {
        let timestamp = self.new_timestamp();
        
        let task = self.tasks.entry(task_id).or_insert_with(|| CrdtTask {
            id: task_id,
            fields: HashMap::new(),
            deleted: false,
            created_at: timestamp.clone(),
            updated_at: timestamp.clone(),
        });
        
        // CRDT: Keep the value with higher timestamp (last-write-wins)
        let should_update = match task.fields.get(&field) {
            Some(existing) => timestamp > existing.timestamp,
            None => true,
        };
        
        if should_update {
            task.fields.insert(field.clone(), CrdtValue {
                value: value.clone(),
                timestamp: timestamp.clone(),
            });
            task.updated_at = timestamp.clone();
            
            let op = if task.fields.len() == 1 && field == "title" {
                Operation::Insert { task_id, field: field.clone(), value: value.clone(), timestamp: timestamp.clone() }
            } else {
                Operation::Update { task_id, field: field.clone(), value: value.clone(), timestamp: timestamp.clone() }
            };
            
            self.operations.push(op);
            console_log!("Upserted field {} for task {}", field, task_id);
        }
    }
    
    /// Delete a task (soft delete)
    pub fn delete_task(&mut self, task_id: u32) {
        let timestamp = self.new_timestamp();
        
        if let Some(task) = self.tasks.get_mut(&task_id) {
            task.deleted = true;
            task.updated_at = timestamp.clone();
            
            self.operations.push(Operation::Delete { task_id, timestamp });
            console_log!("Deleted task {}", task_id);
        }
    }
    
    /// Get all non-deleted tasks
    pub fn get_tasks(&self) -> JsValue {
        let tasks: Vec<&CrdtTask> = self.tasks
            .values()
            .filter(|t| !t.deleted)
            .collect();
        
        serde_wasm_bindgen::to_value(&tasks).unwrap_or(JsValue::NULL)
    }
    
    /// Get task by ID
    pub fn get_task(&self, task_id: u32) -> JsValue {
        match self.tasks.get(&task_id) {
            Some(task) if !task.deleted => {
                serde_wasm_bindgen::to_value(task).unwrap_or(JsValue::NULL)
            }
            _ => JsValue::NULL,
        }
    }
    
    /// Merge another document into this one
    pub fn merge(&mut self, other_json: &str) -> Result<(), JsValue> {
        let other: HashMap<u32, CrdtTask> = serde_json::from_str(other_json)
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;
        
        for (task_id, other_task) in other {
            match self.tasks.get_mut(&task_id) {
                Some(local_task) => {
                    // Merge fields using LWW (Last-Write-Wins)
                    for (field, other_value) in &other_task.fields {
                        match local_task.fields.get(field) {
                            Some(local_value) => {
                                if other_value.timestamp > local_value.timestamp {
                                    local_task.fields.insert(field.clone(), other_value.clone());
                                }
                            }
                            None => {
                                local_task.fields.insert(field.clone(), other_value.clone());
                            }
                        }
                    }
                    
                    // Handle deletion
                    if other_task.deleted && other_task.updated_at > local_task.updated_at {
                        local_task.deleted = true;
                    }
                    
                    // Update timestamps
                    if other_task.updated_at > local_task.updated_at {
                        local_task.updated_at = other_task.updated_at.clone();
                    }
                }
                None => {
                    // Task doesn't exist locally, add it
                    if !other_task.deleted {
                        self.tasks.insert(task_id, other_task);
                    }
                }
            }
        }
        
        console_log!("Merged document. Total tasks: {}", self.tasks.len());
        Ok(())
    }
    
    /// Get document state as JSON for syncing
    pub fn export(&self) -> String {
        serde_json::to_string(&self.tasks).unwrap_or_default()
    }
    
    /// Import document state from JSON
    pub fn import(&mut self, json: &str) -> Result<(), JsValue> {
        self.tasks = serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&format!("Import error: {}", e)))?;
        console_log!("Imported document with {} tasks", self.tasks.len());
        Ok(())
    }
    
    /// Get operations since last sync
    pub fn get_operations(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.operations).unwrap_or(JsValue::NULL)
    }
    
    /// Apply remote operations
    pub fn apply_operations(&mut self, ops_json: &str) -> Result<(), JsValue> {
        let ops: Vec<Operation> = serde_json::from_str(ops_json)
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;
        
        for op in ops {
            match op {
                Operation::Insert { task_id, field, value, timestamp } |
                Operation::Update { task_id, field, value, timestamp } => {
                    self.apply_field_update(task_id, field, value, timestamp);
                }
                Operation::Delete { task_id, timestamp } => {
                    self.apply_deletion(task_id, timestamp);
                }
            }
        }
        
        Ok(())
    }
    
    fn apply_field_update(&mut self, task_id: u32, field: String, value: String, timestamp: LamportTimestamp) {
        let task = self.tasks.entry(task_id).or_insert_with(|| CrdtTask {
            id: task_id,
            fields: HashMap::new(),
            deleted: false,
            created_at: timestamp.clone(),
            updated_at: timestamp.clone(),
        });
        
        match task.fields.get(&field) {
            Some(existing) if existing.timestamp > timestamp => {
                // Local value is newer, keep it
            }
            _ => {
                task.fields.insert(field, CrdtValue { value, timestamp });
            }
        }
    }
    
    fn apply_deletion(&mut self, task_id: u32, timestamp: LamportTimestamp) {
        if let Some(task) = self.tasks.get_mut(&task_id) {
            if timestamp > task.updated_at {
                task.deleted = true;
                task.updated_at = timestamp;
            }
        }
    }
    
    /// Clear all operations (after successful sync)
    pub fn clear_operations(&mut self) {
        self.operations.clear();
    }
    
    /// Get document stats
    pub fn stats(&self) -> JsValue {
        let active_tasks = self.tasks.values().filter(|t| !t.deleted).count();
        let deleted_tasks = self.tasks.values().filter(|t| t.deleted).count();
        let pending_ops = self.operations.len();
        
        let stats = serde_json::json!({
            "node_id": self.node_id,
            "active_tasks": active_tasks,
            "deleted_tasks": deleted_tasks,
            "pending_operations": pending_ops,
            "counter": self.counter,
        });
        
        serde_wasm_bindgen::to_value(&stats).unwrap_or(JsValue::NULL)
    }
    
    /// Generate sync code (short hash of node_id)
    pub fn get_sync_code(&self) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        self.node_id.hash(&mut hasher);
        let hash = hasher.finish();
        
        // Convert to 6-digit alphanumeric
        const CHARS: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        let mut result = String::new();
        let mut num = hash;
        
        for _ in 0..6 {
            result.push(CHARS[(num % CHARS.len() as u64) as usize] as char);
            num /= CHARS.len() as u64;
        }
        
        result
    }
}

/// Utility: Generate unique node ID
/// Takes timestamp from JS (Date.now()) to avoid SystemTime issues in WASM
#[wasm_bindgen]
pub fn generate_node_id(timestamp_ms: u32) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    timestamp_ms.hash(&mut hasher);
    format!("node_{:x}", hasher.finish())
}
