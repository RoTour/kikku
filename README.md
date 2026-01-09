# Start project

## Step 1: Setup Terraform
```
cd ./terraform
terraform init
terraform apply
> dev | prod
```

## Step 2: Spin up db
```
docker compose up -d
```

## Step 3 : Start worker
```
bun run src/worker/index.ts
```

## Step 4: Start server
```
bun run dev
``
