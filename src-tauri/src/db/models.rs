use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ReadingProgress {
    pub file_path: String,
    pub scroll_percentage: f64,
    pub last_read_at: i64,
    pub word_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct RecentFile {
    pub file_path: String,
    pub file_name: String,
    pub opened_at: i64,
}
