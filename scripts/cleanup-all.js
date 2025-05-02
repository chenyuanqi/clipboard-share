#!/usr/bin/env node

/**
 * 云剪 - 彻底清理所有过期剪贴板数据
 * 此脚本用于定期清理所有过期的剪贴板数据，确保完全删除过期内容
 * 可以作为定时任务运行，例如 cron 任务
 */

const fs = require('fs');
const path = require('path');

// 获取当前中国时间
function getChinaTimeMs() {
  const chinaOffset = 8 * 60 * 60 * 1000; // UTC+8
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return utc + chinaOffset;
}

// 格式化中国时间为可读字符串
function formatChinaTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

// 清理主函数
async function cleanupAll() {
  console.log(`===== 云剪 - 彻底清理过期数据 =====`);
  console.log(`当前中国时间: ${formatChinaTime(getChinaTimeMs())}`);
  
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, 'data');
  
  // 检查数据目录是否存在
  if (!fs.existsSync(dataDir)) {
    console.log(`数据目录不存在: ${dataDir}`);
    return;
  }
  
  console.log(`数据目录: ${dataDir}`);
  
  // 清理 clipboards.json
  const clipboardsJsonPath = path.join(dataDir, 'clipboards.json');
  let cleanedClipboards = 0;
  let totalClipboards = 0;
  
  if (fs.existsSync(clipboardsJsonPath)) {
    console.log(`正在清理文件: ${clipboardsJsonPath}`);
    try {
      // 读取并解析文件
      const data = fs.readFileSync(clipboardsJsonPath, 'utf8');
      if (!data.trim()) {
        console.log('剪贴板文件为空');
        return;
      }
      
      let clipboards = JSON.parse(data);
      totalClipboards = Object.keys(clipboards).length;
      console.log(`剪贴板总数: ${totalClipboards}`);
      
      // 当前时间
      const now = getChinaTimeMs();
      
      // 找出所有过期的ID
      const expiredIds = [];
      for (const [id, clipboard] of Object.entries(clipboards)) {
        if (clipboard.expiresAt < now) {
          expiredIds.push(id);
        }
      }
      
      // 删除过期的剪贴板
      expiredIds.forEach(id => {
        delete clipboards[id];
        cleanedClipboards++;
        console.log(`删除过期剪贴板: ID=${id}`);
      });
      
      // 保存更新后的数据
      fs.writeFileSync(clipboardsJsonPath, JSON.stringify(clipboards, null, 2), 'utf8');
      console.log(`已清理 ${cleanedClipboards}/${totalClipboards} 个过期剪贴板`);
      
      // 清理密码文件
      const passwordsJsonPath = path.join(dataDir, 'passwords.json');
      if (fs.existsSync(passwordsJsonPath)) {
        console.log(`正在清理密码文件: ${passwordsJsonPath}`);
        try {
          const pwdData = fs.readFileSync(passwordsJsonPath, 'utf8');
          if (pwdData.trim()) {
            let passwords = JSON.parse(pwdData);
            let passwordsCleaned = 0;
            
            // 删除过期ID对应的密码
            expiredIds.forEach(id => {
              if (passwords[id]) {
                delete passwords[id];
                passwordsCleaned++;
                console.log(`删除密码: ID=${id}`);
              }
            });
            
            if (passwordsCleaned > 0) {
              fs.writeFileSync(passwordsJsonPath, JSON.stringify(passwords, null, 2), 'utf8');
              console.log(`已清理 ${passwordsCleaned} 个密码记录`);
            } else {
              console.log('没有需要清理的密码记录');
            }
          }
        } catch (error) {
          console.error('清理密码文件时出错:', error);
        }
      }
    } catch (error) {
      console.error('清理剪贴板文件时出错:', error);
    }
  } else {
    console.log(`剪贴板文件不存在: ${clipboardsJsonPath}`);
  }
  
  // 清理剪贴板目录
  const clipboardsDir = path.join(dataDir, 'clipboards');
  const passwordsDir = path.join(dataDir, 'passwords');
  
  // 如果目录存在，清理单个剪贴板文件
  if (fs.existsSync(clipboardsDir)) {
    console.log(`正在清理剪贴板目录: ${clipboardsDir}`);
    const files = fs.readdirSync(clipboardsDir).filter(file => file.endsWith('.json'));
    console.log(`找到 ${files.length} 个剪贴板文件`);
    
    let filesCleaned = 0;
    const now = getChinaTimeMs();
    
    // 检查每个文件
    for (const file of files) {
      try {
        const filePath = path.join(clipboardsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const clipboard = JSON.parse(fileContent);
        
        // 检查是否过期
        if (clipboard.expiresAt < now) {
          const id = file.replace('.json', '');
          console.log(`清理过期剪贴板文件: ID=${id}`);
          
          // 删除剪贴板文件
          fs.unlinkSync(filePath);
          filesCleaned++;
          
          // 删除对应的密码文件
          const passwordPath = path.join(passwordsDir, `${id}.json`);
          if (fs.existsSync(passwordPath)) {
            fs.unlinkSync(passwordPath);
            console.log(`删除密码文件: ID=${id}`);
          }
        }
      } catch (error) {
        console.error(`处理文件时出错 ${file}:`, error);
      }
    }
    
    console.log(`已清理 ${filesCleaned} 个剪贴板文件`);
  } else {
    console.log(`剪贴板目录不存在: ${clipboardsDir}`);
  }
  
  console.log(`\n===== 清理总结 =====`);
  console.log(`- JSON对象清理: ${cleanedClipboards}/${totalClipboards}`);
  console.log(`- 清理时间: ${formatChinaTime(getChinaTimeMs())}`);
  console.log(`清理完成！`);
}

// 执行清理
cleanupAll().catch(error => {
  console.error('执行清理脚本时出错:', error);
  process.exit(1);
}); 