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
  const dataDir = path.join(process.cwd(), 'data');
  const clipboardsDir = path.join(dataDir, 'clipboards');
  const passwordsDir = path.join(dataDir, 'passwords');
  
  // 如果目录不存在，无需清理
  if (!fs.existsSync(clipboardsDir)) {
    console.log(`[清理API] 目录不存在，无需清理: ${clipboardsDir}`);
    return { deleted: 0, ids: [] };
  }
  
  // 清理 clipboards.json 和 passwords.json 中的过期数据
  let cleanedFromJsonFiles = 0;
  try {
    const clipboardsJsonPath = path.join(dataDir, 'clipboards.json');
    const passwordsJsonPath = path.join(dataDir, 'passwords.json');
    
    if (fs.existsSync(clipboardsJsonPath)) {
      const clipboardsJsonContent = fs.readFileSync(clipboardsJsonPath, 'utf-8');
      const clipboards = JSON.parse(clipboardsJsonContent);
      const now = getChinaTimeMs();
      const idsToDelete: string[] = [];
      
      // 找出所有过期的ID
      for (const [id, clipboard] of Object.entries(clipboards)) {
        // @ts-ignore
        if (clipboard.expiresAt < now) {
          idsToDelete.push(id);
        }
      }
      
      // 删除过期的剪贴板
      idsToDelete.forEach(id => {
        delete clipboards[id];
        cleanedFromJsonFiles++;
        console.log(`[清理API] 从clipboards.json删除过期剪贴板: ID=${id}`);
      });
      
      // 保存更新后的数据
      fs.writeFileSync(clipboardsJsonPath, JSON.stringify(clipboards, null, 2), 'utf-8');
      
      // 同时清理密码
      if (fs.existsSync(passwordsJsonPath)) {
        const passwordsJsonContent = fs.readFileSync(passwordsJsonPath, 'utf-8');
        const passwords = JSON.parse(passwordsJsonContent);
        
        let passwordsUpdated = false;
        idsToDelete.forEach(id => {
          if (passwords[id]) {
            delete passwords[id];
            passwordsUpdated = true;
            console.log(`[清理API] 从passwords.json删除密码: ID=${id}`);
          }
        });
        
        if (passwordsUpdated) {
          fs.writeFileSync(passwordsJsonPath, JSON.stringify(passwords, null, 2), 'utf-8');
        }
      }
    }
  } catch (error) {
    console.error('[清理API] 清理JSON文件时出错:', error);
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
  
  const totalDeleted = deletedFiles.length + cleanedFromJsonFiles;
  console.log(`[清理API] 清理完成，删除了${totalDeleted}个过期剪贴板 (文件: ${deletedFiles.length}, JSON对象: ${cleanedFromJsonFiles})`);
  
  return {
    deleted: totalDeleted,
    ids: deletedFiles
  };
} 