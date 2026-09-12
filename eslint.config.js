import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // v6 新规则：effect 内同步 setState（加载数据模式）误报过多，暂缓
      "react-hooks/set-state-in-effect": "off",
      // v6 新规则：useEffect 引用组件后部声明的 hook setter（稳定引用，运行期安全）误报
      "react-hooks/immutability": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "off",
      // hook setter（useState 解构）在 useEffect 闭包中先于声明引用——运行期合法
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
  },
  prettier,
);
