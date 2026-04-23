/** @type {import('tailwindcss').Config} */
export default {
  // Tailwindが走査する対象ファイルを指定
  content: ['./client/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      // ChampixFlow カラーパレット（医療系 × プロフェッショナルダーク）
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // インディゴ（メインカラー）
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        success: {
          400: '#34d399',
          500: '#10b981', // エメラルド（交付済み・OK）
          600: '#059669',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b', // アンバー（注意・次回予定）
          600: '#d97706',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444', // レッド（離脱懸念）
          600: '#dc2626',
        },
        surface: {
          900: '#0f172a', // ダークベース
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          100: '#f1f5f9',
          50:  '#f8fafc',
        },
      },
      fontFamily: {
        // プロフェッショナルで読みやすいサンセリフ
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // 印刷用：A5横（210mm × 148mm）
      screens: {
        print: { raw: 'print' },
      },
    },
  },
  plugins: [],
};
