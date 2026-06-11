# Base de datos (Supabase)

Proyecto remoto: **Appmorcito** (`mkcorooniwpfdmmazaio`). El CLI no está instalado
globalmente; se usa vía `pnpm dlx supabase ...`.

## Estructura

- `migrations/` — cambios de esquema, un archivo por cambio, con prefijo
  `YYYYMMDDHHMMSS_`. Son el registro versionado de todo lo aplicado al remoto.
- `rollbacks/` — para cada migración, un `<timestamp>_<nombre>_down.sql` que
  revierte sus cambios.

## Aplicar migraciones

```bash
pnpm dlx supabase login        # una vez (o exportar SUPABASE_ACCESS_TOKEN)
pnpm dlx supabase link --project-ref mkcorooniwpfdmmazaio
pnpm dlx supabase db push      # aplica las migraciones pendientes al remoto
```

Alternativa: pegar el contenido del archivo de `migrations/` en el SQL Editor
del dashboard (el archivo en el repo sigue siendo el registro).

## Revertir una migración

1. Ejecutar el archivo correspondiente de `rollbacks/` en el SQL Editor
   (o con `psql` apuntando a la base remota).
2. Si la migración se había aplicado con `db push`, sincronizar el historial:

```bash
pnpm dlx supabase migration repair --status reverted <timestamp>
```

## Migraciones

| Timestamp | Descripción | Rollback |
|---|---|---|
| `20260610120000` | Citas: tablas `date_spots` y `date_visits`, triggers de contador/estado y RLS por pareja | `rollbacks/20260610120000_create_dates_feature_down.sql` |
| `20260611100000` | Fix: policy UPDATE en `date_visits` + backfill de fotos huérfanas | `rollbacks/20260611100000_fix_date_visits_update_policy_down.sql` |
| `20260611100001` | Categorías de citas: `date_categories` + `date_spot_categories` (M:N) con RLS | `rollbacks/20260611100001_date_categories_down.sql` |
| `20260611150000` | Auditoría de wishlist: `created_by`, `purchased_by`, `purchased_at` | `rollbacks/20260611150000_wishlist_audit_down.sql` |
