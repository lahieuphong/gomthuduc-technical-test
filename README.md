# Gốm Production Pipeline

Working MVP điều phối và giám sát quy trình sản xuất xưởng gốm.

## Khởi chạy local

Tạo file môi trường từ mẫu và cài dependency:

```bash
cp .env.example .env
npm install
npm run prisma:generate
```

Khởi chạy development server:

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run build
```
