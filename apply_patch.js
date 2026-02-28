/* apply_patch.js 脚本（同你之前收到的版本） */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/library/App.tsx');

if (!fs.existsSync(filePath)) {
  console.error('文件不存在:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

if (!/items\.map\s*\(/.test(content)) {
  console.error('未在文件中找到 items.map(...)，请确认文件内容与预期匹配。');
  process.exit(1);
}

const bakPath = filePath + '.auto.bak';
if (!fs.existsSync(bakPath)) {
  fs.copyFileSync(filePath, bakPath);
  console.log('已创建自动备份:', bakPath);
} else {
  console.log('自动备份已存在:', bakPath);
}

const startIdx = content.indexOf('{items.map(');
if (startIdx === -1) {
  console.error('找不到 "{items.map(" 起始位置，终止。');
  process.exit(1);
}

let endIdx = -1;
const substr = content.slice(startIdx);
const closePattern = /\)\s*\}\s*,?\s*\)/;
const m = closePattern.exec(substr);
if (m) {
  endIdx = startIdx + m.index + m[0].length;
} else {
  const alt = substr.indexOf('}))') !== -1 ? substr.indexOf('}))') + 3 : -1;
  if (alt !== -1) endIdx = startIdx + alt;
}

if (endIdx === -1) {
  console.error('未能自动定位 items.map(...) 的结束位置。为保险起见，请手动替换或把文件片段贴给我。');
  process.exit(1);
}

const newBlock = `
{items.map((item) => (
  <div
    key={item.id}
    style={{
      border: '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px',
      display: 'flex',
      gap: '16px',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    {item.imageDataUrl && (
      <img
        src={item.imageDataUrl}
        alt="题目截图"
        style={{
          width: '120px',
          height: '90px',
          objectFit: 'cover',
          borderRadius: '6px',
          flexShrink: 0,
          border: '1px solid #eee',
        }}
      />
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          color: STATUS_COLOR[item.status],
          background: \`\${STATUS_COLOR[item.status]}18\`,
          marginBottom: '8px',
        }}
      >
        {STATUS_LABEL[item.status]}
      </div>

      {item.status !== 'processing' && (
        <>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {item.question || '（无题目内容）'}
          </p>

          {item.answer && (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: '#555',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <strong>答案：</strong>
              {item.answer}
            </p>
          )}

          {item.status === 'failed' && item.errorMessage && (
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '12px',
                color: '#d00',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              <strong>错误原因：</strong> {item.errorMessage}
            </p>
          )}
        </>
      )}

      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#aaa' }}>
        {new Date(item.createdAt).toLocaleString('zh-CN')} · {item.sourceRegion}
      </p>
    </div>
  </div>
))}
`;

const newContent = content.slice(0, startIdx) + newBlock + content.slice(endIdx);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('替换完成，原始文件备份保存在:', bakPath);
