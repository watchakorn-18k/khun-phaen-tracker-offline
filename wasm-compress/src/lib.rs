use wasm_bindgen::prelude::*;
use lz4_flex::{compress_prepend_size, decompress_size_prepended};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

/// Compress data using LZ4
/// Returns base64 encoded compressed data
#[wasm_bindgen]
pub fn compress(data: &str) -> Result<String, JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    let bytes = data.as_bytes();
    let compressed = compress_prepend_size(bytes);
    
    // Convert to base64 for safe storage
    let base64 = base64_encode(&compressed);
    
    let ratio = (compressed.len() as f32 / bytes.len() as f32) * 100.0;
    console_log!("Compressed: {} bytes -> {} bytes ({:.1}%)", bytes.len(), compressed.len(), ratio);
    
    Ok(base64)
}

/// Decompress data using LZ4
/// Input should be base64 encoded compressed data
#[wasm_bindgen]
pub fn decompress(data: &str) -> Result<String, JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    // Decode base64
    let compressed = base64_decode(data)
        .map_err(|e| JsValue::from_str(&format!("Base64 decode error: {}", e)))?;
    
    // Decompress
    let decompressed = decompress_size_prepended(&compressed)
        .map_err(|e| JsValue::from_str(&format!("Decompression error: {:?}", e)))?;
    
    let result = String::from_utf8(decompressed)
        .map_err(|e| JsValue::from_str(&format!("UTF-8 decode error: {}", e)))?;
    
    console_log!("Decompressed: {} bytes", result.len());
    
    Ok(result)
}

/// Check if data is compressed (by checking prefix)
#[wasm_bindgen]
pub fn is_compressed(data: &str) -> bool {
    // Check if it starts with our magic bytes or looks like base64 of compressed data
    if data.len() < 10 {
        return false;
    }
    
    // Try to decode first few bytes and check for LZ4 magic
    if let Ok(decoded) = base64_decode(&data[..20]) {
        // LZ4 frame format starts with specific magic number
        // But for our simple prepend_size format, we just check if it can be decompressed
        decompress_size_prepended(&decoded).is_ok()
    } else {
        false
    }
}

/// Get compression ratio
#[wasm_bindgen]
pub fn get_compression_ratio(original: &str, compressed: &str) -> f32 {
    let original_len = original.len();
    let compressed_len = compressed.len();
    
    if original_len == 0 {
        return 0.0;
    }
    
    ((original_len - compressed_len) as f32 / original_len as f32) * 100.0
}

/// Simple base64 encode
fn base64_encode(data: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    
    for chunk in data.chunks(3) {
        let b = match chunk.len() {
            1 => [chunk[0], 0, 0],
            2 => [chunk[0], chunk[1], 0],
            _ => [chunk[0], chunk[1], chunk[2]],
        };
        
        result.push(ALPHABET[(b[0] >> 2) as usize] as char);
        result.push(ALPHABET[(((b[0] & 0x03) << 4) | (b[1] >> 4)) as usize] as char);
        
        if chunk.len() > 1 {
            result.push(ALPHABET[(((b[1] & 0x0f) << 2) | (b[2] >> 6)) as usize] as char);
        } else {
            result.push('=');
        }
        
        if chunk.len() > 2 {
            result.push(ALPHABET[(b[2] & 0x3f) as usize] as char);
        } else {
            result.push('=');
        }
    }
    
    result
}

/// Simple base64 decode
fn base64_decode(data: &str) -> Result<Vec<u8>, &'static str> {
    const ALPHABET: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    let mut result = Vec::new();
    let chars: Vec<char> = data.chars().collect();
    
    for chunk in chars.chunks(4) {
        if chunk.len() < 2 {
            return Err("Invalid base64");
        }
        
        let c1 = ALPHABET.find(chunk[0]).ok_or("Invalid char")? as u8;
        let c2 = ALPHABET.find(chunk[1]).ok_or("Invalid char")? as u8;
        
        result.push((c1 << 2) | (c2 >> 4));
        
        if chunk.len() > 2 && chunk[2] != '=' {
            let c3 = ALPHABET.find(chunk[2]).ok_or("Invalid char")? as u8;
            result.push(((c2 & 0x0f) << 4) | (c3 >> 2));
            
            if chunk.len() > 3 && chunk[3] != '=' {
                let c4 = ALPHABET.find(chunk[3]).ok_or("Invalid char")? as u8;
                result.push(((c3 & 0x03) << 6) | c4);
            }
        }
    }
    
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_roundtrip() {
        let original = "Hello, World! สวัสดีชาวโลก 🌍";
        let compressed = compress(original).unwrap();
        let decompressed = decompress(&compressed).unwrap();
        assert_eq!(original, decompressed);
    }
    
    #[test]
    fn test_base64() {
        let data = b"Hello World";
        let encoded = base64_encode(data);
        let decoded = base64_decode(&encoded).unwrap();
        assert_eq!(data.to_vec(), decoded);
    }
}
