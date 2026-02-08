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

#[derive(Serialize, Deserialize, Clone)]
pub struct SearchDocument {
    pub id: u32,
    pub title: String,
    pub project: String,
    pub category: String,
    pub notes: String,
    pub status: String,
    pub assignee: String,
}

#[wasm_bindgen]
pub struct SearchEngine {
    documents: Vec<SearchDocument>,
    ngram_index: HashMap<String, Vec<u32>>, // ngram -> document ids
}

#[wasm_bindgen]
impl SearchEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SearchEngine {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();
        
        SearchEngine {
            documents: Vec::new(),
            ngram_index: HashMap::new(),
        }
    }

    /// Add or update documents in the search index
    pub fn index_documents(&mut self, documents_js: JsValue) -> Result<(), JsValue> {
        let documents: Vec<SearchDocument> = serde_wasm_bindgen::from_value(documents_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse documents: {}", e)))?;
        
        self.documents = documents;
        self.build_index();
        
        console_log!("Indexed {} documents", self.documents.len());
        Ok(())
    }

    fn build_index(&mut self) {
        self.ngram_index.clear();
        
        for doc in &self.documents {
            let searchable_text = format!(
                "{} {} {} {} {}",
                doc.title,
                doc.project,
                doc.category,
                doc.notes,
                doc.assignee
            ).to_lowercase();
            
            // Build n-gram index (2-grams and 3-grams)
            let ngrams = self.generate_ngrams(&searchable_text, 2);
            for ngram in ngrams {
                self.ngram_index
                    .entry(ngram)
                    .or_insert_with(Vec::new)
                    .push(doc.id);
            }
        }
        
        // Remove duplicates from index
        for ids in self.ngram_index.values_mut() {
            ids.sort_unstable();
            ids.dedup();
        }
    }

    fn generate_ngrams(&self, text: &str, n: usize) -> Vec<String> {
        let chars: Vec<char> = text.chars().collect();
        let mut ngrams = Vec::new();
        
        // Skip if text is too short
        if chars.len() < n {
            return vec![text.to_string()];
        }
        
        for window in chars.windows(n) {
            ngrams.push(window.iter().collect::<String>());
        }
        
        // Also include single characters for matching
        for ch in chars.iter().take(10) {
            ngrams.push(ch.to_string());
        }
        
        ngrams
    }

    /// Search with fuzzy matching
    pub fn search(&self, query: String, limit: usize) -> Result<JsValue, JsValue> {
        if query.trim().is_empty() {
            return serde_wasm_bindgen::to_value(&self.documents)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
        }

        let query_lower = query.to_lowercase();
        let mut doc_scores: HashMap<u32, f32> = HashMap::new();

        // Score based on n-gram matching
        let query_ngrams = self.generate_ngrams(&query_lower, 2);
        for ngram in query_ngrams {
            if let Some(doc_ids) = self.ngram_index.get(&ngram) {
                for &id in doc_ids {
                    *doc_scores.entry(id).or_insert(0.0) += 1.0;
                }
            }
        }

        // Calculate final scores with various bonuses
        let mut results: Vec<(f32, &SearchDocument)> = Vec::new();
        
        for doc in &self.documents {
            let base_score = *doc_scores.get(&doc.id).unwrap_or(&0.0);
            
            if base_score == 0.0 {
                continue;
            }
            
            let mut final_score = base_score;
            
            // Exact match bonuses
            let title_lower = doc.title.to_lowercase();
            let project_lower = doc.project.to_lowercase();
            let category_lower = doc.category.to_lowercase();
            let notes_lower = doc.notes.to_lowercase();
            let assignee_lower = doc.assignee.to_lowercase();
            
            // Title exact match (highest priority)
            if title_lower == query_lower {
                final_score += 100.0;
            } else if title_lower.starts_with(&query_lower) {
                final_score += 50.0;
            } else if title_lower.contains(&query_lower) {
                final_score += 30.0;
            }
            
            // Word boundary match in title
            for word in title_lower.split_whitespace() {
                if word == query_lower {
                    final_score += 20.0;
                } else if word.starts_with(&query_lower) {
                    final_score += 10.0;
                }
            }
            
            // Other field matches
            if project_lower.contains(&query_lower) {
                final_score += 15.0;
            }
            if category_lower.contains(&query_lower) {
                final_score += 12.0;
            }
            if assignee_lower.contains(&query_lower) {
                final_score += 18.0;
            }
            if notes_lower.contains(&query_lower) {
                final_score += 8.0;
            }
            
            // Fuzzy match for typo tolerance
            let fuzzy_score = self.fuzzy_score(&query_lower, &title_lower);
            final_score += fuzzy_score * 10.0;
            
            if final_score > 0.0 {
                results.push((final_score, doc));
            }
        }
        
        // Sort by score (descending)
        results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
        
        // Take top results
        let top_results: Vec<&SearchDocument> = results
            .into_iter()
            .take(limit)
            .map(|(_, doc)| doc)
            .collect();
        
        serde_wasm_bindgen::to_value(&top_results)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Calculate fuzzy matching score using Levenshtein distance
    fn fuzzy_score(&self, query: &str, target: &str) -> f32 {
        if query.is_empty() || target.is_empty() {
            return 0.0;
        }
        
        // Check for substring match
        if target.contains(query) {
            return 1.0;
        }
        
        // Check for character containment
        let query_chars: Vec<char> = query.chars().collect();
        let target_chars: Vec<char> = target.chars().collect();
        
        let mut matches = 0;
        let mut target_idx = 0;
        
        for query_ch in &query_chars {
            while target_idx < target_chars.len() {
                if target_chars[target_idx] == *query_ch {
                    matches += 1;
                    target_idx += 1;
                    break;
                }
                target_idx += 1;
            }
        }
        
        let containment_ratio = matches as f32 / query_chars.len() as f32;
        
        // Calculate Levenshtein distance for words
        let query_words: Vec<&str> = query.split_whitespace().collect();
        let target_words: Vec<&str> = target.split_whitespace().collect();
        
        let mut best_word_score = 0.0f32;
        
        for q_word in &query_words {
            for t_word in &target_words {
                let dist = self.levenshtein_distance(q_word, t_word);
                let max_len = q_word.len().max(t_word.len()) as f32;
                if max_len > 0.0 {
                    let similarity = 1.0 - (dist as f32 / max_len);
                    best_word_score = best_word_score.max(similarity);
                }
            }
        }
        
        (containment_ratio + best_word_score) / 2.0
    }

    fn levenshtein_distance(&self, s1: &str, s2: &str) -> usize {
        let s1_chars: Vec<char> = s1.chars().collect();
        let s2_chars: Vec<char> = s2.chars().collect();
        
        let len1 = s1_chars.len();
        let len2 = s2_chars.len();
        
        if len1 == 0 { return len2; }
        if len2 == 0 { return len1; }
        
        let mut matrix = vec![vec![0; len2 + 1]; len1 + 1];
        
        for i in 0..=len1 {
            matrix[i][0] = i;
        }
        for j in 0..=len2 {
            matrix[0][j] = j;
        }
        
        for i in 1..=len1 {
            for j in 1..=len2 {
                let cost = if s1_chars[i - 1] == s2_chars[j - 1] { 0 } else { 1 };
                matrix[i][j] = (matrix[i - 1][j] + 1)
                    .min(matrix[i][j - 1] + 1)
                    .min(matrix[i - 1][j - 1] + cost);
            }
        }
        
        matrix[len1][len2]
    }

    /// Quick search - simpler but faster
    pub fn quick_search(&self, query: String) -> Result<JsValue, JsValue> {
        self.search(query, 50)
    }

    /// Get suggestions based on partial input
    pub fn suggest(&self, partial: String, limit: usize) -> Result<JsValue, JsValue> {
        if partial.len() < 2 {
            return serde_wasm_bindgen::to_value(&Vec::<String>::new())
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
        }

        let partial_lower = partial.to_lowercase();
        let mut suggestions: Vec<(f32, String)> = Vec::new();
        let mut seen = std::collections::HashSet::new();
        
        // Collect all unique words from documents
        for doc in &self.documents {
            let words: Vec<&str> = doc.title.split_whitespace()
                .chain(doc.project.split_whitespace())
                .chain(doc.category.split_whitespace())
                .collect();
            
            for word in words {
                let word_lower = word.to_lowercase();
                if seen.contains(&word_lower) {
                    continue;
                }
                seen.insert(word_lower.clone());
                
                let mut score = 0.0f32;
                
                // Prefix match
                if word_lower.starts_with(&partial_lower) {
                    score += 2.0;
                }
                
                // Contains match
                if word_lower.contains(&partial_lower) {
                    score += 1.0;
                }
                
                // Fuzzy match
                let fuzzy = self.fuzzy_score(&partial_lower, &word_lower);
                if fuzzy > 0.7 {
                    score += fuzzy;
                }
                
                if score > 0.0 {
                    suggestions.push((score, word.to_string()));
                }
            }
        }
        
        suggestions.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
        suggestions.dedup_by(|a, b| a.1.to_lowercase() == b.1.to_lowercase());
        
        let top_suggestions: Vec<String> = suggestions
            .into_iter()
            .take(limit)
            .map(|(_, word)| word)
            .collect();
        
        serde_wasm_bindgen::to_value(&top_suggestions)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Clear the index
    pub fn clear(&mut self) {
        self.documents.clear();
        self.ngram_index.clear();
    }

    /// Get document count
    pub fn count(&self) -> usize {
        self.documents.len()
    }
}
