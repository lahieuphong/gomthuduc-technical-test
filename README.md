# Gốm Production Pipeline

Working MVP điều phối và giám sát quy trình sản xuất xưởng gốm.

## Khởi chạy local

Yêu cầu:

- Node.js 20.19 trở lên
- Yarn Classic 1.22.x

Tạo file môi trường từ mẫu và cài dependency bằng Yarn:

```bash
cp .env.example .env
yarn install
yarn prisma:generate
```

Khởi chạy development server:

```bash
yarn dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

## Kiểm tra chất lượng

```bash
yarn lint
yarn typecheck
yarn build
```
