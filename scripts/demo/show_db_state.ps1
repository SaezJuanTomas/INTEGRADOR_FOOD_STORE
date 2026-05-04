$ErrorActionPreference = 'Stop'

Write-Host "== Persistencia en PostgreSQL (docker) ==" -ForegroundColor Cyan

$tablesSql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
$productCategorySql = "SELECT producto_id, categoria_id, es_principal, created_at FROM productos_categorias ORDER BY producto_id, categoria_id;"
$productIngredientSql = "SELECT producto_id, ingrediente_id, es_removible, es_opcional FROM productos_ingredientes ORDER BY producto_id, ingrediente_id;"
$productSql = "SELECT id, nombre, precio_base, disponible FROM productos ORDER BY id;"

Write-Host "\n-- Tablas public --" -ForegroundColor Yellow
docker exec -it food_store_postgres psql -U postgres -d food_store_db -c $tablesSql

Write-Host "\n-- productos --" -ForegroundColor Yellow
docker exec -it food_store_postgres psql -U postgres -d food_store_db -c $productSql

Write-Host "\n-- productos_categorias --" -ForegroundColor Yellow
docker exec -it food_store_postgres psql -U postgres -d food_store_db -c $productCategorySql

Write-Host "\n-- productos_ingredientes --" -ForegroundColor Yellow
docker exec -it food_store_postgres psql -U postgres -d food_store_db -c $productIngredientSql
