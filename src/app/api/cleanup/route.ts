import { NextResponse } from 'next/server';
import { cleanupExpiredClipboards } from '@/app/api/clipboard/route';
import { formatChinaTime, getChinaTimeMs } from '@/utils/helpers';
import fs from 'fs';
import path from 'path';

// 此路由处理剪贴板的清理
// 可以通过cron作业定期调用此API
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceMode = searchParams.get('force') === 'true';
    const hours = searchParams.get('hours');
    
    // 获取当前中国时区时间
    const now = getChinaTimeMs();
    console.log(`清理过期剪贴板服务开始执行，当前中国时间: ${formatChinaTime(now)}`);
    
    // 如果指定了小时，使用该值，否则使用默认的0（立即清理）
    const additionalHours = hours ? parseInt(hours) : 0;
    
    // 调用本地文件中的清理函数而不是从clipboard路由导入
    const result = cleanupLocalExpiredClipboards(additionalHours);
    
    // 强制模式下无法在服务器端清理localStorage
    // 这部分将由客户端脚本完成
    
    return NextResponse.json({
      success: true,
      cleanedCount: result.deleted,
      cleanedIds: result.ids,
      timestamp: now,
      formattedTime: formatChinaTime(now)
    });
  } catch (error) {
    console.error('清理过期剪贴板失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '清理过程中出错' 
    }, { status: 500 });
  }
}

// 实际的清理是在每次页面加载时由客户端执行的
// 见 storage.ts 中的初始化代码 

function cleanupLocalExpiredClipboards(additionalHours: number = 0): { deleted: number, ids: string[] } {
  // 日志
  console.log(`[清理API] 开始清理过期超过${additionalHours}小时的剪贴板...`);
  
  // 存储目录
  const clipboardsDir = path.join(process.cwd(), 'data', 'clipboards');
  const passwordsDir = path.join(process.cwd(), 'data', 'passwords');
  
  // 如果目录不存在，无需清理
  if (!fs.existsSync(clipboardsDir)) {
    console.log(`[清理API] 目录不存在，无需清理: ${clipboardsDir}`);
    return { deleted: 0, ids: [] };
  }
  
  // 列出所有JSON文件
  const files = fs.readdirSync(clipboardsDir)
    .filter(file => file.endsWith('.json'));
    
  console.log(`[清理API] 找到${files.length}个剪贴板文件`);
  
  // 当前中国时间
  const now = getChinaTimeMs();
  console.log(`[清理API] 当前中国时间: ${formatChinaTime(now)}`);
  
  const deletedFiles: string[] = [];
  
  // 检查每个文件
  for (const file of files) {
    try {
      const filePath = path.join(clipboardsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const clipboard = JSON.parse(fileContent);
      
      // 检查是否过期
      const expiresAt = clipboard.expiresAt;
      
      // 额外宽限期（毫秒）
      const graceMilliseconds = additionalHours * 60 * 60 * 1000;
      
      // 如果剪贴板已过期超过指定的额外小时数
      if (now > expiresAt + graceMilliseconds) {
        // 计算过期了多少小时
        const hoursSinceExpiry = (now - expiresAt) / (60 * 60 * 1000);
        
        // 获取ID（去掉.json后缀）
        const id = file.replace('.json', '');
        
        console.log(`[清理API] 清理过期剪贴板：ID=${id}，过期时间：${formatChinaTime(clipboard.expiresAt)}，已过期 ${hoursSinceExpiry.toFixed(2)} 小时`);
        
        // 删除剪贴板文件
        fs.unlinkSync(filePath);
        
        // 删除对应的密码文件（如果存在）
        const passwordPath = path.join(passwordsDir, `${id}.json`);
        if (fs.existsSync(passwordPath)) {
          fs.unlinkSync(passwordPath);
          console.log(`[清理API] 删除密码文件: ${id}.json`);
        }
        
        deletedFiles.push(id);
      }
    } catch (error) {
      console.error(`[清理API] 处理文件时出错 ${file}:`, error);
    }
  }
  
  console.log(`[清理API] 清理完成，删除了${deletedFiles.length}个过期剪贴板`);
  
  return {
    deleted: deletedFiles.length,
    ids: deletedFiles
  };
} 