import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 关闭未使用变量的警告，但保留对导入的检查
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "varsIgnorePattern": "^_", 
        "argsIgnorePattern": "^_",
        "ignoreRestSiblings": true 
      }],
      // 将 useEffect 依赖警告降级为警告而非错误
      "react-hooks/exhaustive-deps": "warn",
      // 允许 JSX 中使用引号等字符
      "react/no-unescaped-entities": "off",
      // 允许使用 any 类型，但给出警告
      "@typescript-eslint/no-explicit-any": "warn",
      // 图片优化建议降级为警告
      "@next/next/no-img-element": "warn"
    }
  }
];

export default eslintConfig;
