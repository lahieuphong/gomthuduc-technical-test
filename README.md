# Gốm Production Pipeline

Working MVP điều phối và giám sát quy trình sản xuất xưởng gốm.

## Khởi chạy local

Yêu cầu:

- Node.js 20.19 trở lên
- Corepack
- Yarn 4.18.x

Tạo file môi trường từ mẫu và cài dependency bằng Yarn:

```bash
cp .env.example .env
corepack enable
yarn install --immutable
yarn prisma:generate
yarn db:migrate --name init
yarn db:seed
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
yarn test
yarn build
```
