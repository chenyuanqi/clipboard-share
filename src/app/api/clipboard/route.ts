import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { formatChinaTime, getChinaTimeMs, convertToChinaTime } from '@/utils/helpers';

// 存储剪贴板内容的文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const CLIPBOARD_FILE = path.join(DATA_DIR, 'clipboards.json');
const PASSWORDS_FILE = path.join(DATA_DIR, 'passwords.json');

// 确保数据目录和文件存在
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`已创建数据目录: ${DATA_DIR}`);
  }

  // 如果剪贴板文件不存在，创建一个空的
  if (!fs.existsSync(CLIPBOARD_FILE)) {
    fs.writeFileSync(CLIPBOARD_FILE, JSON.stringify({}), 'utf8');
    console.log(`已创建剪贴板文件: ${CLIPBOARD_FILE}`);
  }
} catch (error) {
  console.error('初始化数据目录/文件失败:', error);
}

// 定义剪贴板数据类型
interface Clipboard {
  content: string;
  isProtected: boolean;
  createdAt: number;
  expiresAt: number;
  lastModified: number;
}

// 获取所有剪贴板数据
function getAllClipboards(): Record<string, Clipboard> {
  try {
    // 如果文件不存在，返回空对象
    if (!fs.existsSync(CLIPBOARD_FILE)) {
      console.log('剪贴板文件不存在，返回空对象');
      return {};
    }
    
    const data = fs.readFileSync(CLIPBOARD_FILE, 'utf8');
    console.log(`读取剪贴板文件成功，数据长度: ${data.length}`);
    
    // 如果是空文件或无效JSON，返回空对象
    if (!data.trim()) {
      console.log('剪贴板文件为空，返回空对象');
      return {};
    }
    
    try {
      const clipboards = JSON.parse(data);
      console.log(`解析剪贴板数据成功，包含 ${Object.keys(clipboards).length} 条记录`);
      return clipboards;
    } catch (parseError) {
      console.error('解析剪贴板数据失败:', parseError);
      // 文件可能损坏，创建一个新的空文件
      fs.writeFileSync(CLIPBOARD_FILE, JSON.stringify({}), 'utf8');
      return {};
    }
  } catch (error) {
    console.error('读取剪贴板文件失败:', error);
    return {};
  }
}

// 保存所有剪贴板数据
function saveAllClipboards(clipboards: Record<string, Clipboard>): void {
  try {
    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    const jsonData = JSON.stringify(clipboards, null, 2);
    fs.writeFileSync(CLIPBOARD_FILE, jsonData, 'utf8');
    console.log(`保存剪贴板数据成功，包含 ${Object.keys(clipboards).length} 条记录`);
    
    // 验证保存是否成功
    if (fs.existsSync(CLIPBOARD_FILE)) {
      const savedData = fs.readFileSync(CLIPBOARD_FILE, 'utf8');
      if (savedData === jsonData) {
        console.log('数据验证成功');
      } else {
        console.error('数据验证失败，已写入的数据与期望不符');
      }
    } else {
      console.error('文件写入后未找到');
    }
  } catch (error) {
    console.error('保存剪贴板文件失败:', error);
  }
}

// 清理所有过期的剪贴板
function cleanupExpiredClipboards(additionalHours: number = 0): string[] {
  try {
    const now = getChinaTimeMs();
    console.log(`[内部清理] 当前中国时间: ${formatChinaTime(now)} (${now})`);
    
    const clipboards = getAllClipboards();
    const expiredIds: string[] = [];
    let hasExpired = false;
    
    // 找出所有过期的剪贴板ID
    for (const [id, clipboard] of Object.entries(clipboards)) {
      // 计算过期时间阈值（当前时间减去额外小时数）
      const expiryThreshold = additionalHours > 0 
        ? now - (additionalHours * 3600 * 1000) // 额外过期时间（小时）转为毫秒
        : now;
        
      if (clipboard.expiresAt && clipboard.expiresAt < expiryThreshold) {
        expiredIds.push(id);
        delete clipboards[id];
        hasExpired = true;
        
        // 根据是否使用额外过期时间来显示不同的日志
        if (additionalHours > 0) {
          console.log(`清理过期超过${additionalHours}小时的剪贴板：ID=${id}，过期时间：${formatChinaTime(clipboard.expiresAt)}`);
        } else {
          console.log(`清理过期剪贴板：ID=${id}，过期时间：${formatChinaTime(clipboard.expiresAt)}`);
        }
      }
    }
    
    // 如果有过期的剪贴板，保存更新后的数据
    if (hasExpired) {
      saveAllClipboards(clipboards);
      
      // 根据是否使用额外过期时间来显示不同的日志
      if (additionalHours > 0) {
        console.log(`共清理了 ${expiredIds.length} 个过期超过${additionalHours}小时的剪贴板`);
      } else {
        console.log(`共清理了 ${expiredIds.length} 个过期剪贴板`);
      }
      
      // 同时清理对应的密码数据
      try {
        if (fs.existsSync(PASSWORDS_FILE)) {
          const passwordsData = fs.readFileSync(PASSWORDS_FILE, 'utf8');
          if (passwordsData.trim()) {
            const passwords = JSON.parse(passwordsData);
            let passwordsUpdated = false;
            
            // 删除对应的密码数据
            for (const id of expiredIds) {
              if (passwords[id]) {
                delete passwords[id];
                passwordsUpdated = true;
                console.log(`清理密码数据：ID=${id}`);
              }
            }
            
            // 如果有更新密码数据，保存更新后的密码文件
            if (passwordsUpdated) {
              fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2), 'utf8');
              console.log(`密码数据已更新，删除了 ${expiredIds.length} 个对应记录`);
            }
          }
        }
      } catch (error) {
        console.error('清理密码数据时出错:', error);
      }
    }
    
    return expiredIds;
  } catch (error) {
    console.error('清理过期剪贴板失败:', error);
    return [];
  }
}

// GET 请求 - 获取指定ID的剪贴板内容
export async function GET(request: Request) {
  try {
    // 先清理过期的剪贴板（包括过期1小时以上的）
    cleanupExpiredClipboards();
    cleanupExpiredClipboards(1); // 清理过期超过1小时的
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      console.log('GET请求: 未提供ID参数');
      return NextResponse.json({ error: '未提供ID参数' }, { status: 400 });
    }
    
    console.log(`获取ID=${id}的剪贴板内容`);
    const clipboards = getAllClipboards();
    const clipboard = clipboards[id] || null;
    
    if (!clipboard) {
      console.log(`ID=${id}的剪贴板不存在`);
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    
    // 检查是否过期
    if (clipboard.expiresAt) {
      const now = getChinaTimeMs();
      if (clipboard.expiresAt < now) {
        console.log(`ID=${id}的剪贴板已过期，过期时间: ${formatChinaTime(clipboard.expiresAt)}`);
        console.log(`当前中国时间: ${formatChinaTime(now)}`);
        
        // 删除过期的剪贴板
        delete clipboards[id];
        saveAllClipboards(clipboards);
        
        // 同时删除对应的密码数据
        try {
          if (fs.existsSync(PASSWORDS_FILE)) {
            const passwordsData = fs.readFileSync(PASSWORDS_FILE, 'utf8');
            if (passwordsData.trim()) {
              const passwords = JSON.parse(passwordsData);
              if (passwords[id]) {
                delete passwords[id];
                fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2), 'utf8');
                console.log(`已删除过期剪贴板(${id})的密码数据`);
              }
            }
          }
        } catch (error) {
          console.error('删除密码数据时出错:', error);
        }
        
        // 返回过期状态而不是不存在，这样前端可以区分这两种情况
        return NextResponse.json({ exists: false, expired: true }, { status: 200 });
      }
    }
    
    console.log(`返回ID=${id}的剪贴板，过期时间: ${new Date(clipboard.expiresAt).toISOString()}`);
    
    // 返回剪贴板数据
    return NextResponse.json({
      exists: true,
      clipboard
    }, { status: 200 });
  } catch (error) {
    console.error('获取剪贴板内容失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST 请求 - 创建或更新剪贴板
export async function POST(request: Request) {
  try {
    // 先清理过期的剪贴板
    cleanupExpiredClipboards();
    cleanupExpiredClipboards(1); // 清理过期超过1小时的
    
    const data = await request.json();
    const { id, content, isProtected, expirationHours } = data;
    
    console.log(`【服务器API】收到POST请求，ID=${id}`);
    console.log(`【服务器API】请求参数:`);
    console.log(`【服务器API】- id = ${id}`);
    console.log(`【服务器API】- isProtected = ${isProtected} (${typeof isProtected})`);
    console.log(`【服务器API】- expirationHours = ${expirationHours} (${typeof expirationHours})`);
    
    if (!id) {
      console.log('【服务器API错误】POST请求未提供ID参数');
      return NextResponse.json({ error: '未提供ID参数' }, { status: 400 });
    }

    // 获取已有剪贴板数据
    const clipboards = getAllClipboards();
    
    // 检查是否已存在
    const existingClipboard = clipboards[id];
    
    // 检查现有剪贴板是否过期，如果过期，删除它
    if (existingClipboard && existingClipboard.expiresAt) {
      const now = getChinaTimeMs();
      if (existingClipboard.expiresAt < now) {
        console.log(`【服务器API】ID=${id}的剪贴板已过期，将被删除并重新创建`);
        delete clipboards[id];
        
        // 同时删除对应的密码数据
        try {
          if (fs.existsSync(PASSWORDS_FILE)) {
            const passwordsData = fs.readFileSync(PASSWORDS_FILE, 'utf8');
            if (passwordsData.trim()) {
              const passwords = JSON.parse(passwordsData);
              if (passwords[id]) {
                delete passwords[id];
                fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2), 'utf8');
                console.log(`已删除过期剪贴板(${id})的密码数据`);
              }
            }
          }
        } catch (error) {
          console.error('删除密码数据时出错:', error);
        }
      }
    }
    
    // 统一使用分钟为单位计算时间
    // 解析过期时间（支持带单位的格式）
    let expirationMinutes: number;
    
    if (typeof expirationHours === 'string' && expirationHours.endsWith('m')) {
      // 如果直接提供了分钟数（例如 "5m"）
      expirationMinutes = parseFloat(expirationHours);
      console.log(`【服务器API】检测到分钟单位: ${expirationHours}`);
      console.log(`【服务器API】解析结果: ${expirationMinutes} 分钟 (${expirationMinutes/60} 小时)`);
    } else {
      // 默认情况: 转换小时为分钟
      const hours = parseFloat(expirationHours) || 24; // 默认24小时
      expirationMinutes = hours * 60;
      console.log(`【服务器API】检测到小时单位: ${expirationHours}`);
      console.log(`【服务器API】解析结果: ${hours} 小时 (${expirationMinutes} 分钟)`);
    }
    
    // 计算毫秒数
    const millisecondsToExpire = expirationMinutes * 60 * 1000;
    
    // 使用中国时区的当前时间
    const now = getChinaTimeMs();
    const expiresAt = now + millisecondsToExpire;
    
    console.log(`【服务器API】当前中国时间: ${formatChinaTime(now)} (${now})`);
    console.log(`【服务器API】过期时间: ${formatChinaTime(expiresAt)} (${expiresAt})`);
    console.log(`【服务器API】过期时长: ${expirationMinutes}分钟 (${millisecondsToExpire}毫秒)`);
    
    // 创建或更新剪贴板数据
    const clipboard: Clipboard = {
      content: content || '',
      // 使用数字来表示布尔值，0 = false, 1 = true
      isProtected: isProtected === true || isProtected === "true" || isProtected === 1 || isProtected === "1" ? true : false,
      createdAt: existingClipboard ? existingClipboard.createdAt : now,
      expiresAt: expiresAt,
      lastModified: now
    };
    
    console.log(`【服务器API】【详细日志】最终保存的剪贴板数据:`);
    console.log(`【服务器API】【详细日志】- id = ${id}`);
    console.log(`【服务器API】【详细日志】- isProtected = ${clipboard.isProtected} (${typeof clipboard.isProtected})`);
    console.log(`【服务器API】【详细日志】- createdAt = ${new Date(clipboard.createdAt).toLocaleString()}`);
    console.log(`【服务器API】【详细日志】- expiresAt = ${new Date(clipboard.expiresAt).toLocaleString()}`);
    console.log(`【服务器API】【详细日志】- lastModified = ${new Date(clipboard.lastModified).toLocaleString()}`);
    
    clipboards[id] = clipboard;
    
    saveAllClipboards(clipboards);
    
    console.log(`ID=${id}的剪贴板已${existingClipboard ? '更新' : '创建'}，将在${formatChinaTime(expiresAt)}过期`);
    
    console.log(`【服务器API】【详细日志】准备返回响应:`);
    console.log(`【服务器API】【详细日志】- success = true`);
    console.log(`【服务器API】【详细日志】- isUpdate = ${existingClipboard ? true : false}`);
    console.log(`【服务器API】【详细日志】- 返回的剪贴板对象:`);
    console.log(`【服务器API】【详细日志】  - isProtected = ${clipboard.isProtected} (${typeof clipboard.isProtected})`);
    console.log(`【服务器API】【详细日志】  - createdAt = ${formatChinaTime(clipboard.createdAt)}`);
    console.log(`【服务器API】【详细日志】  - expiresAt = ${formatChinaTime(clipboard.expiresAt)}`);
    
    const response = { 
      success: true, 
      isUpdate: existingClipboard ? true : false,
      clipboard: {
        content: clipboard.content,
        isProtected: clipboard.isProtected,
        createdAt: clipboard.createdAt,
        expiresAt: clipboard.expiresAt,
        lastModified: clipboard.lastModified
      }
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('保存剪贴板内容出错:', error);
    return NextResponse.json({ error: '保存剪贴板内容失败' }, { status: 500 });
  }
}

// DELETE 请求 - 删除剪贴板
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      console.log('DELETE请求: 未提供ID参数');
      return NextResponse.json({ error: '未提供ID参数' }, { status: 400 });
    }
    
    console.log(`准备删除ID=${id}的剪贴板`);
    const clipboards = getAllClipboards();
    const existed = !!clipboards[id];
    
    if (existed) {
      delete clipboards[id];
      saveAllClipboards(clipboards);
      console.log(`ID=${id}的剪贴板已删除`);
    } else {
      console.log(`ID=${id}的剪贴板不存在，无需删除`);
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('删除剪贴板出错:', error);
    return NextResponse.json({ error: '删除剪贴板失败' }, { status: 500 });
  }
} 