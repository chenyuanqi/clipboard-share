import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = searchParams.get('data');
    const size = parseInt(searchParams.get('size') || '200', 10);
    const light = searchParams.get('light') || '#ffffff'; // 背景色
    const dark = searchParams.get('dark') || '#000000';   // 前景色
    
    if (!data) {
      return NextResponse.json({ error: '未提供数据参数' }, { status: 400 });
    }
    
    // 生成QR码为DataURL（Base64）
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      color: {
        dark: dark,
        light: light,
      },
      errorCorrectionLevel: 'H', // 高纠错级别，提高扫描成功率
    });
    
    // 返回DataURL
    return NextResponse.json({ url: qrCodeDataUrl });
  } catch (error) {
    console.error('生成QR码失败:', error);
    return NextResponse.json({ error: '生成QR码失败' }, { status: 500 });
  }
} 