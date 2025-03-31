import { NextResponse } from 'next/server';
import { cleanupExpiredClipboards } from '@/utils/storage';

// 此路由处理剪贴板的清理
// 可以通过cron作业定期调用此API
export async function GET() {
  try {
    // 这只能在客户端运行，因为它使用localStorage
    // 在服务器端，这会返回一个消息说明需要在客户端运行
    return NextResponse.json({
      message: '清理过程需要在客户端运行',
      note: '此API仅作为指导，实际清理在页面加载时进行'
    });
  } catch (error) {
    console.error('清理过程出错:', error);
    return NextResponse.json({ error: '清理过程失败' }, { status: 500 });
  }
}

// 实际的清理是在每次页面加载时由客户端执行的
// 见 storage.ts 中的初始化代码 