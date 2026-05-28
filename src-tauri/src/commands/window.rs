use tauri::{command, WebviewUrl, WebviewWindowBuilder};

#[command]
pub async fn new_window(
    app: tauri::AppHandle,
    file_path: Option<String>,
    workspace_path: Option<String>,
) -> Result<(), String> {
    let label = format!(
        "window-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );

    // 构建带查询参数的 URL
    let url = if file_path.is_some() || workspace_path.is_some() {
        let mut parts = Vec::new();
        if let Some(ref path) = file_path {
            parts.push(format!("file={}", urlencoding::encode(path)));
        }
        if let Some(ref path) = workspace_path {
            parts.push(format!("workspace={}", urlencoding::encode(path)));
        }
        format!("index.html?{}", parts.join("&"))
    } else {
        "index.html".to_string()
    };

    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
        .title("ErgeMD")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .decorations(false)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}
