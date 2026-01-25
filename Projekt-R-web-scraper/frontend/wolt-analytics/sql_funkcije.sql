/*
  ============================================================
  RESTORANG — Supabase RPC Functions (SQL Documentation)
  ============================================================

  Ova datoteka sadrži sve SQL funkcije (RPC) koje frontend koristi.
  Funkcije se pozivaju preko supabase.rpc("ime_funkcije").

  Zašto RPC funkcije?
  - Frontend dobije već pripremljene agregacije (prosjeke, brojeve, top liste)
  - Logika je centralizirana u bazi (jedno mjesto istine)
  - Lakše je optimizirati (indexi / view / caching)

  Napomena o STABLE:
  - STABLE znači da unutar jedne transakcije funkcija vraća konzistentan rezultat,
    ali može koristiti SELECT nad tablicama.
  - To je ok za reporting.

  Tablice (pretpostavka prema kodu funkcija):
  - public.restaurant (rest_id, name, quarter, ...)
  - public.price (rest_id, date, value, ...)

  ============================================================
*/


/* ============================================================
   1) restaurant_cost_index_latest()
   ============================================================

   Svrha:
   - Vraća "index" restorana za NAJNOVIJI DAN u tablici price.
   - Za svaki restoran + kvart računa prosječnu cijenu (avg_price) i broj mjerenja (n)
   - Filtrira samo restorane koji imaju dovoljno podataka (having count(*) >= 5)

   Output stupci:
   - rest_id        : ID restorana (integer)
   - restaurant     : naziv restorana (text) -> r.name preimenovan
   - quarter        : kvart (text) -> r.quarter
   - avg_price      : prosječna cijena za taj restoran na zadnji dan (numeric, 2 decimale)
   - n              : koliko zapisa cijena je ušlo u prosjek (bigint)

   Logika:
   - last_day CTE:
       pronalazi maksimalni datum u public.price
   - glavni SELECT:
       join price -> restaurant po rest_id
       join last_day da uzme samo zapise gdje je p.date = zadnji dan
       group by restoran + kvart
       having count(*) >= 5 (da maknemo "premalo uzoraka")
       order by avg_price desc (od najskupljeg restorana prema jeftinijima)

   Zašto having >= 5:
   - Stabilniji prosjek (manje šuma)
   - Izbjegava da restoran s 1-2 cijene "odleti" u ranking

   Tipične stvari za kolege:
   - Ako želite drugačiji cutoff, promijenite "having count(*) >= 5"
   - Ako želite prosjek kroz više dana, treba maknuti last_day i dodati period filter

*/
CREATE OR REPLACE FUNCTION public.restaurant_cost_index_latest()
RETURNS TABLE(
  rest_id integer,
  restaurant text,
  quarter text,
  avg_price numeric,
  n bigint
)
LANGUAGE sql
STABLE
AS $function$
  with last_day as (
    select max(date) as d
    from public.price
  )
  select
    r.rest_id,
    r.name as restaurant,
    r.quarter,
    round(avg(p.value)::numeric, 2) as avg_price,
    count(*)::bigint as n
  from public.price p
  join public.restaurant r on r.rest_id = p.rest_id
  join last_day ld on p.date = ld.d
  where r.quarter is not null
  group by r.rest_id, r.name, r.quarter
  having count(*) >= 5
  order by avg_price desc;
$function$;


/* ============================================================
   2) quarter_price_index_latest()
   ============================================================

   Svrha:
   - Agregira podatke iz restaurant_cost_index_latest() na razinu KVARTA.
   - Dakle: prvo računamo prosjek po restoranu (na zadnji dan),
     onda tek iz toga računamo prosjek kvarta.

   Zašto "prosjek prosjeka"?
   - restaurant_cost_index_latest daje avg_price po restoranu
   - quarter_price_index_latest radi avg(avg_price) po kvartovima
   - Time svaki restoran ima "jednak glas", bez obzira koliko zapisa cijena ima.
     (npr. restoran s 200 zapisa ne dominira nad restoranom s 5 zapisa)

   Output stupci:
   - quarter              : naziv kvarta (text)
   - avg_restaurant_price : prosjek cijena restorana u kvartu (numeric, 2 decimale)
   - restaurants          : koliko restorana je ušlo u izračun (bigint)

   Sort:
   - order by avg_restaurant_price desc (najskuplji kvartovi na vrhu)

*/
CREATE OR REPLACE FUNCTION public.quarter_price_index_latest()
RETURNS TABLE(
  quarter text,
  avg_restaurant_price numeric,
  restaurants bigint
)
LANGUAGE sql
STABLE
AS $function$
  with rc as (
    select * from public.restaurant_cost_index_latest()
  )
  select
    quarter,
    round(avg(avg_price)::numeric, 2) as avg_restaurant_price,
    count(*)::bigint as restaurants
  from rc
  group by quarter
  order by avg_restaurant_price desc;
$function$;


/* ============================================================
   3) quarter_min_max_latest()
   ============================================================

   Svrha:
   - Iz quarter_price_index_latest() uzima:
     - najjeftiniji kvart (minimum avg_restaurant_price)
     - najskuplji kvart (maximum avg_restaurant_price)
   - Računa razliku (diff)

   Output stupci:
   - cheapest_quarter      : naziv najjeftinijeg kvarta
   - cheapest_avg          : prosjek najjeftinijeg kvarta
   - most_expensive_quarter: naziv najskupljeg kvarta
   - most_expensive_avg    : prosjek najskupljeg kvarta
   - diff                  : razlika (najskuplji - najjeftiniji) zaokruženo na 2 decimale

   Kako radi:
   - CTE q = svi kvartovi + prosjeci
   - CTE mn = 1 red s najmanjim prosjekom
   - CTE mx = 1 red s najvećim prosjekom
   - final select iz mn, mx (cartesian product, ali oba su po 1 red -> 1 rezultat)

*/
CREATE OR REPLACE FUNCTION public.quarter_min_max_latest()
RETURNS TABLE(
  cheapest_quarter text,
  cheapest_avg numeric,
  most_expensive_quarter text,
  most_expensive_avg numeric,
  diff numeric
)
LANGUAGE sql
STABLE
AS $function$
  with q as (
    select * from public.quarter_price_index_latest()
  ),
  mn as (
    select quarter, avg_restaurant_price
    from q
    order by avg_restaurant_price asc
    limit 1
  ),
  mx as (
    select quarter, avg_restaurant_price
    from q
    order by avg_restaurant_price desc
    limit 1
  )
  select
    mn.quarter as cheapest_quarter,
    mn.avg_restaurant_price as cheapest_avg,
    mx.quarter as most_expensive_quarter,
    mx.avg_restaurant_price as most_expensive_avg,
    round((mx.avg_restaurant_price - mn.avg_restaurant_price)::numeric, 2) as diff
  from mn, mx;
$function$;


/* ============================================================
   4) best_value_quarters_latest(p_limit int = 8)
   ============================================================

   Svrha:
   - Izračunava "best value" kvartove.
   - Definicija score-a:
       score = restaurants / avg_restaurant_price
     gdje je:
       restaurants = broj restorana u kvartu
       avg_restaurant_price = prosjek kvarta (prosjek prosjeka restorana)

   Intuicija score-a:
   - Više restorana (ponuda) -> score raste
   - Niža cijena -> score raste
   - Dakle: kvart s puno restorana i nižom cijenom je "best value"

   Zašto nullif(avg_restaurant_price, 0)?
   - Zaštita od dijeljenja s nulom (ako bi se ikad dogodilo da avg = 0)

   Parametar:
   - p_limit: koliko top kvartova vratiti (default 8)

   Output stupci:
   - quarter
   - score (numeric, 3 decimale)
   - restaurants
   - avg_restaurant_price

   Sort:
   - order by score desc (najbolji score prvo)

*/
CREATE OR REPLACE FUNCTION public.best_value_quarters_latest(p_limit integer DEFAULT 8)
RETURNS TABLE(
  quarter text,
  score numeric,
  restaurants bigint,
  avg_restaurant_price numeric
)
LANGUAGE sql
STABLE
AS $function$
  with q as (
    select * from public.quarter_price_index_latest()
  )
  select
    quarter,
    round((restaurants::numeric / nullif(avg_restaurant_price,0))::numeric, 3) as score,
    restaurants,
    avg_restaurant_price
  from q
  order by score desc
  limit p_limit;
$function$;