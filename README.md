# Quiz React App

一个基于 **Vite + React** 的刷题网站模板，支持：

- 导入本地 JSON 试卷
- 自动保存进度到 localStorage
- 刷新后恢复同一份试卷的作答状态
- 交卷后显示得分、正确答案与解析
- 可直接部署到 GitHub Pages

## 启动

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物在 `dist/` 目录。

## 试卷 JSON 格式

```json
{
  "title": "试卷名称",
  "items": [
    {
      "id": "q1",
      "question": "题干",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "correct_answer": "A",
      "rationale": "解析",
      "difficulty": "easy",
      "tags": ["grammar", "vocabulary"]
    }
  ]
}
```

## GitHub Pages 部署

1. 把项目推到 GitHub 仓库
2. 进入仓库 `Settings -> Pages`
3. 选择 **GitHub Actions** 或直接构建后发布 `dist`
4. 如果你走静态方式，也可以本地 `npm run build` 后把 `dist` 内容发布

这个项目的 `vite.config.js` 已经设成了相对路径 `base: './'`，更适合静态托管。