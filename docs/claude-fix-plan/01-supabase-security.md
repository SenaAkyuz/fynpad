# 01 — Supabase RPC ve RLS Güvenliği

## Öncelik

P0 — Play Store production yayını öncesi zorunlu.

## Sorunun özeti

Birden fazla PostgreSQL fonksiyonu `SECURITY DEFINER` olarak tanımlanmış, fakat execute yetkileri açıkça kısıtlanmamış. PostgreSQL'de yeni fonksiyonlar varsayılan olarak `PUBLIC` execute yetkisine sahip olabilir. Supabase bunları RPC yüzeyinden erişilebilir hâle getirebilir.

Riskli fonksiyonlar:

- `public.process_recurring_rules(p_user_id uuid, p_target_date date)`
- `public.process_recurring_rules_all_users()`
- `public.seed_default_categories(p_user_id uuid)`
- `public.process_my_recurring_rules(p_target_date date)`

Etkilenen mevcut migrationlar:

- `supabase/migrations/0002_categories_transactions.sql`
- `supabase/migrations/0003_recurring_rules.sql`
- `supabase/migrations/0004_fix_recurring_dedupe.sql`

## Tehdit senaryoları

1. Bir istemci başka bir kullanıcının UUID'siyle `process_recurring_rules` çağırabilir.
2. Çok ileri bir hedef tarih vererek büyük miktarda transaction üretmeye ve DB kaynaklarını tüketmeye çalışabilir.
3. `process_recurring_rules_all_users` bütün kullanıcılar için pahalı bir işlem başlatabilir.
4. `seed_default_categories` başka bir kullanıcının hesabına istenmeyen kategoriler ekleyebilir.
5. `SECURITY DEFINER` + gevşek `search_path`, gelecekte public schema'ya yazma yetkisi oluşursa object-shadowing riskini artırır.

## İstenen uygulama

Yeni ve ileri numaralı bir migration oluştur. Eski migrationları değiştirme. Önerilen ad:

`supabase/migrations/0011_harden_rpc_permissions.sql`

Migration şunları yapmalı:

1. Riskli fonksiyonların execute yetkilerini `PUBLIC`, `anon` ve `authenticated` rollerinden kaldır.
2. Yalnızca uygulamanın çağırması gereken `process_my_recurring_rules(date)` fonksiyonuna `authenticated` rolü için execute ver.
3. `process_recurring_rules(uuid,date)`, `process_recurring_rules_all_users()` ve `seed_default_categories(uuid)` istemci rollerine kapalı kalmalı.
4. `process_my_recurring_rules` her zaman `auth.uid()` kullanmalı; dışarıdan `user_id` kabul etmemeli.
5. `p_target_date` sunucu tarafında güvenli bir aralığa sıkıştırılmalı. Normal mobil istemci geçmiş catch-up için bugünden ileri tarih işlememelidir. En güvenlisi hedef tarihi `least(coalesce(p_target_date,current_date), current_date)` yapmak veya gelecekteki tarihi reddetmektir.
6. Geçmiş catch-up için makul bir alt sınır değerlendir. Sınırsız yıllarca günlük loop yerine ürün gereksinimine uygun üst işlem sayısı/tarih penceresi koy.
7. `SECURITY DEFINER` fonksiyonlarında `set search_path = ''` tercih et ve bütün nesneleri `public.transactions`, `public.recurring_rules` şeklinde şema adıyla kullan.
8. Cron fonksiyonu normal istemci rollerince çağrılamamalı. Cron job doğrudan güvenilir DB context'iyle çalışmalı.
9. `delete_user_account()` için mevcut revoke/grant düzenini koru ve gerekirse aynı migration içinde yeniden doğrula.

## Veri bütünlüğü sertleştirmesi

RLS yalnızca satırdaki `user_id` alanını kontrol ediyor. Transaction veya recurring rule oluştururken verilen `category_id`'nin de aynı kullanıcıya ait olduğu DB seviyesinde garanti edilmeli.

Uygun çözümlerden birini uygula:

- Composite foreign key: kategorilerde `(id,user_id)` unique, child tablolarda `(category_id,user_id)` foreign key; veya
- `BEFORE INSERT/UPDATE` trigger ile category owner doğrulaması; veya
- Güvenli RPC üzerinden insert ve doğrudan tablo insert yetkisini kısıtlama.

Aynı sahiplik kontrolünü `transactions`, `recurring_rules` ve `category_budgets` için değerlendir.

## Yetki doğrulama sorguları

Migration sonrasında Supabase SQL Editor'da aşağıdaki mantığı doğrula:

```sql
select
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'process_recurring_rules',
    'process_my_recurring_rules',
    'process_recurring_rules_all_users',
    'seed_default_categories',
    'delete_user_account'
  );
```

Beklenti:

- `process_my_recurring_rules`: anon false, authenticated true.
- İç/admin fonksiyonları: anon false, authenticated false.
- `delete_user_account`: anon false, authenticated true.

## Negatif güvenlik testleri

- Anon token ile bütün RPC çağrıları reddedilmeli.
- Authenticated kullanıcı iç fonksiyonlara doğrudan erişememeli.
- Authenticated kullanıcı `process_my_recurring_rules` ile gelecekteki bir tarih gönderse bile geleceğe işlem üretilmemeli.
- Başka kullanıcıya ait category ID ile transaction/recurring/budget insert edilememeli.
- Normal uygulama açılışındaki recurring catch-up çalışmaya devam etmeli.
- Cron çalışmaya devam etmeli fakat mobil istemci cron fonksiyonunu çağırmamalı.

## Kabul kriterleri

- İstemci yalnızca kendi recurring kurallarını işleyebilir.
- Hedef tarih abuse ile sınırsız transaction üretilemez.
- Admin/internal fonksiyonlar PostgREST RPC üzerinden istemci rollerine kapalıdır.
- Cross-user foreign key ilişkisi oluşturulamaz.
- Mevcut kullanıcıların verisi ve cron akışı bozulmaz.

