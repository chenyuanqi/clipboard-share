import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 存储剪贴板内容的文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const CLIPBOARD_FILE = path.join(DATA_DIR, 'clipboards.json');

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

// 获取所有剪贴板数据
function getAllClipboards(): Record<string, any> {
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
function saveAllClipboards(clipboards: Record<string, any>): void {
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

// GET 请求 - 获取指定ID的剪贴板内容
export async function GET(request: Request) {
  try {
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
    if (clipboard.expiresAt && clipboard.expiresAt < Date.now()) {
      console.log(`ID=${id}的剪贴板已过期`);
      // 删除过期剪贴板
      delete clipboards[id];
      saveAllClipboards(clipboards);
      return NextResponse.json({ exists: false, expired: true }, { status: 200 });
    }
    
    console.log(`已找到ID=${id}的剪贴板`);
    return NextResponse.json({ 
      exists: true, 
      clipboard: {
        content: clipboard.content,
        isProtected: clipboard.isProtected,
        createdAt: clipboard.createdAt,
        expiresAt: clipboard.expiresAt,
        lastModified: clipboard.lastModified
      }
    }, { status: 200 });
  } catch (error) {
    console.error('获取剪贴板内容出错:', error);
    return NextResponse.json({ error: '获取剪贴板内容失败' }, { status: 500 });
  }
}

// POST 请求 - 创建或更新剪贴板
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { id, content, isProtected, expirationHours } = data;
    
    if (!id) {
      console.log('POST请求: 未提供ID参数');
      return NextResponse.json({ error: '未提供ID参数' }, { status: 400 });
    }
    
    console.log(`准备创建/更新ID=${id}的剪贴板，过期时间：${expirationHours}小时`);
    
    const now = Date.now();
    // 确保精确计算过期时间，避免舍入误差
    const hoursToExpire = expirationHours || 24; // 默认24小时
    const millisecondsToExpire = Math.floor(hoursToExpire * 3600 * 1000); // 精确计算毫秒数
    const expiresAt = now + millisecondsToExpire;
    
    console.log(`当前时间: ${new Date(now).toISOString()}, 过期时间: ${new Date(expiresAt).toISOString()}, 时间差: ${millisecondsToExpire}毫秒`);
    
    const clipboards = getAllClipboards();
    
    // 检查是否是更新现有剪贴板
    const isUpdate = id in clipboards;
    
    clipboards[id] = {
      content,
      isProtected: !!isProtected,
      createdAt: isUpdate ? clipboards[id].createdAt : now,
      expiresAt,
      lastModified: now
    };
    
    saveAllClipboards(clipboards);
    
    console.log(`ID=${id}的剪贴板已${isUpdate ? '更新' : '创建'}，将在${hoursToExpire}小时后过期`);
    return NextResponse.json({ 
      success: true, 
      isUpdate,
      clipboard: {
        content,
        isProtected: !!isProtected,
        createdAt: clipboards[id].createdAt,
        expiresAt,
        lastModified: now
      }
    }, { status: 200 });
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