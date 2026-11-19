<?php
// Minimal image upload endpoint for Kalpna Editor (upload-url="upload.php").
// Returns JSON: { "url": "uploads/xxxx.png" }
header('Content-Type: application/json');

$allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
$maxBytes = 5 * 1024 * 1024;

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}
$file = $_FILES['file'];
$type = mime_content_type($file['tmp_name']);
if (!isset($allowed[$type]) || $file['size'] > $maxBytes) {
    http_response_code(415);
    echo json_encode(['error' => 'Unsupported or too large image']);
    exit;
}

$dir = __DIR__ . '/uploads';
if (!is_dir($dir)) mkdir($dir, 0755, true);
$name = bin2hex(random_bytes(8)) . '.' . $allowed[$type];
move_uploaded_file($file['tmp_name'], "$dir/$name");

echo json_encode(['url' => 'uploads/' . $name]);
