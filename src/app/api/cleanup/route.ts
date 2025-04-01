import { NextResponse } from 'next/server';
import { cleanupExpiredClipboards } from '@/utils/storage';
import fs from 'fs';
import path from 'path';
import { formatChinaTime } from '@/utils/helpers';

// 导入服务端清理函数
const DATA_DIR = path.join(process.cwd(), 'data');
const CLIPBOARD_FILE = path.join(DATA_DIR, 'clipboards.json');
const PASSWORDS_FILE = path.join(DATA_DIR, 'passwords.json');

// 定义剪贴板数据类型
interface Clipboard {
  content: string;
  isProtected: boolean;
  createdAt: number;
  expiresAt: number;
  lastModified: number;
}

// 服务端清理函数
function cleanupExpiredServerClipboards(): { deletedClipboards: number, deletedPasswords: number } {
  try {
    const now = Date.now();
    let clipboardsUpdated = false;
    let passwordsUpdated = false;
    const expiredIds: string[] = [];
    
    // 清理剪贴板数据
    if (fs.existsSync(CLIPBOARD_FILE)) {
      const clipboardData = fs.readFileSync(CLIPBOARD_FILE, 'utf8');
      if (clipboardData.trim()) {
        try {
          const clipboards = JSON.parse(clipboardData) as Record<string, Clipboard>;
          
          // 找出所有过期的剪贴板ID，包括过期超过1小时的
          for (const [id, clipboard] of Object.entries(clipboards)) {
            // 计算1小时前的时间戳
            const oneHourAgo = now - (1 * 3600 * 1000);
            
            // 检查是否过期，或过期超过1小时
            if (clipboard.expiresAt && clipboard.expiresAt < now) {
              expiredIds.push(id);
              delete clipboards[id];
              clipboardsUpdated = true;
              
              // 记录额外日志信息
              const hoursSinceExpiry = ((now - clipboard.expiresAt) / (3600 * 1000)).toFixed(1);
              console.log(`[清理API] 清理过期剪贴板：ID=${id}，过期时间：${formatChinaTime(clipboard.expiresAt)}，已过期 ${hoursSinceExpiry} 小时`);
            }
          }
          
          // 保存更新后的剪贴板数据
          if (clipboardsUpdated) {
            fs.writeFileSync(CLIPBOARD_FILE, JSON.stringify(clipboards, null, 2), 'utf8');
            console.log(`[清理API] 清理了 ${expiredIds.length} 个过期剪贴板`);
          }
        } catch (error) {
          console.error('[清理API] 解析剪贴板数据失败:', error);
        }
      }
    }
    
    // 清理密码数据
    let deletedPasswordCount = 0;
    if (expiredIds.length > 0 && fs.existsSync(PASSWORDS_FILE)) {
      const passwordData = fs.readFileSync(PASSWORDS_FILE, 'utf8');
      if (passwordData.trim()) {
        try {
          const passwords = JSON.parse(passwordData);
          
          // 删除对应的密码
          for (const id of expiredIds) {
            if (passwords[id]) {
              delete passwords[id];
              passwordsUpdated = true;
              deletedPasswordCount++;
            }
          }
          
          // 保存更新后的密码数据
          if (passwordsUpdated) {
            fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2), 'utf8');
            console.log(`[清理API] 清理了 ${deletedPasswordCount} 个密码记录`);
          }
        } catch (error) {
          console.error('[清理API] 解析密码数据失败:', error);
        }
      }
    }
    
    return {
      deletedClipboards: expiredIds.length,
      deletedPasswords: deletedPasswordCount
    };
  } catch (error) {
    console.error('[清理API] 清理过程出错:', error);
    return { deletedClipboards: 0, deletedPasswords: 0 };
  }
}

// 此路由处理剪贴板的清理
// 可以通过cron作业定期调用此API
export async function GET() {
  try {
    // 在服务器端执行清理
    const serverCleanupResult = cleanupExpiredServerClipboards();
    
    // 返回清理结果
    return NextResponse.json({
      success: true,
      serverCleanup: serverCleanupResult,
      message: '清理过程已完成',
      note: '此API除了服务器端清理外，客户端也会在页面加载时自动清理本地过期数据'
    });
  } catch (error) {
    console.error('清理过程出错:', error);
    return NextResponse.json({ error: '清理过程失败' }, { status: 500 });
  }
}

// 实际的清理是在每次页面加载时由客户端执行的
// 见 storage.ts 中的初始化代码 