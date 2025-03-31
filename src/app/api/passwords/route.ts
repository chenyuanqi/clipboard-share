import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 存储密码的文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const PASSWORDS_FILE = path.join(DATA_DIR, 'passwords.json');

// 确保数据目录存在
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`已创建数据目录: ${DATA_DIR}`);
  }

  // 如果密码文件不存在，创建一个空的
  if (!fs.existsSync(PASSWORDS_FILE)) {
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify({}), 'utf8');
    console.log(`已创建密码文件: ${PASSWORDS_FILE}`);
  }
} catch (error) {
  console.error('初始化数据目录/文件失败:', error);
}

// 加密函数 - 用于加密存储的密码
function encryptPassword(password: string): string {
  // 使用简单加密，实际生产环境应使用更安全的方法
  const salt = process.env.PASSWORD_SALT || 'default-salt-for-clipboard-app';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// 获取所有密码
function getAllPasswords(): Record<string, string> {
  try {
    // 如果文件不存在，返回空对象
    if (!fs.existsSync(PASSWORDS_FILE)) {
      console.log('密码文件不存在，返回空对象');
      return {};
    }
    
    const data = fs.readFileSync(PASSWORDS_FILE, 'utf8');
    console.log(`读取密码文件成功，数据长度: ${data.length}`);
    
    // 如果是空文件或无效JSON，返回空对象
    if (!data.trim()) {
      console.log('密码文件为空，返回空对象');
      return {};
    }
    
    try {
      const passwords = JSON.parse(data);
      console.log(`解析密码数据成功，包含 ${Object.keys(passwords).length} 条记录`);
      return passwords;
    } catch (parseError) {
      console.error('解析密码数据失败:', parseError);
      // 文件可能损坏，创建一个新的空文件
      fs.writeFileSync(PASSWORDS_FILE, JSON.stringify({}), 'utf8');
      return {};
    }
  } catch (error) {
    console.error('读取密码文件失败:', error);
    return {};
  }
}

// 保存所有密码
function saveAllPasswords(passwords: Record<string, string>): void {
  try {
    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    const jsonData = JSON.stringify(passwords, null, 2);
    fs.writeFileSync(PASSWORDS_FILE, jsonData, 'utf8');
    console.log(`保存密码数据成功，包含 ${Object.keys(passwords).length} 条记录`);
    
    // 验证保存是否成功
    if (fs.existsSync(PASSWORDS_FILE)) {
      const savedData = fs.readFileSync(PASSWORDS_FILE, 'utf8');
      if (savedData === jsonData) {
        console.log('数据验证成功');
      } else {
        console.error('数据验证失败，已写入的数据与期望不符');
      }
    } else {
      console.error('文件写入后未找到');
    }
  } catch (error) {
    console.error('保存密码文件失败:', error);
  }
}

// GET 请求 - 获取指定ID的密码
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      console.log('GET请求: 未提供ID参数');
      return NextResponse.json({ error: '未提供ID参数' }, { status: 400 });
    }
    
    console.log(`检查ID=${id}的密码是否存在`);
    const passwords = getAllPasswords();
    const hashedPassword = passwords[id] || null;
    
    if (!hashedPassword) {
      console.log(`ID=${id}的密码不存在`);
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    
    console.log(`ID=${id}的密码存在`);
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    console.error('获取密码出错:', error);
    return NextResponse.json({ error: '获取密码失败' }, { status: 500 });
  }
}

// POST 请求 - 保存密码
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { id, password } = data;
    
    if (!id || !password) {
      console.log('POST请求: 未提供ID或密码');
      return NextResponse.json({ error: '未提供ID或密码' }, { status: 400 });
    }
    
    console.log(`准备保存ID=${id}的密码`);
    
    // 加密密码后存储
    const hashedPassword = encryptPassword(password);
    const passwords = getAllPasswords();
    passwords[id] = hashedPassword;
    saveAllPasswords(passwords);
    
    console.log(`ID=${id}的密码已保存`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('保存密码出错:', error);
    return NextResponse.json({ error: '保存密码失败' }, { status: 500 });
  }
}

// DELETE 请求 - 删除密码
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      console.log('DELETE请求: 未提供ID参数');
      return NextResponse.json({ error: '未提供ID参数' }, { status: 400 });
    }
    
    console.log(`准备删除ID=${id}的密码`);
    const passwords = getAllPasswords();
    const existed = !!passwords[id];
    
    if (existed) {
      delete passwords[id];
      saveAllPasswords(passwords);
      console.log(`ID=${id}的密码已删除`);
    } else {
      console.log(`ID=${id}的密码不存在，无需删除`);
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('删除密码出错:', error);
    return NextResponse.json({ error: '删除密码失败' }, { status: 500 });
  }
}

// 用于验证密码的API
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, password } = data;
    
    if (!id || !password) {
      console.log('PUT请求: 未提供ID或密码');
      return NextResponse.json({ error: '未提供ID或密码' }, { status: 400 });
    }
    
    console.log(`验证ID=${id}的密码`);
    const passwords = getAllPasswords();
    const storedHash = passwords[id];
    
    if (!storedHash) {
      console.log(`ID=${id}的密码不存在，验证失败`);
      return NextResponse.json({ valid: false, error: '未找到对应密码' }, { status: 200 });
    }
    
    // 验证密码
    const hashedPassword = encryptPassword(password);
    const isValid = storedHash === hashedPassword;
    
    console.log(`ID=${id}的密码验证结果: ${isValid ? '成功' : '失败'}`);
    return NextResponse.json({ valid: isValid }, { status: 200 });
  } catch (error) {
    console.error('验证密码出错:', error);
    return NextResponse.json({ error: '验证密码失败' }, { status: 500 });
  }
} 