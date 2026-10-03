-- Read only. Returns one row: paste the whole value back.
select jsonb_pretty(jsonb_build_object(
  'columns', (
    select jsonb_object_agg(t, cols) from (
      select c.table_name t, jsonb_agg(c.column_name || ' ' || c.data_type || case when c.is_nullable = 'NO' then ' not null' else '' end || coalesce(' = ' || c.column_default, '') order by c.ordinal_position) cols
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name in ('businesses','appointments','services','business_members','availability','staff_services','time_blocks','users','booking_links','client_notes','reviews','referral_points')
      group by c.table_name) x),
  'constraints', (
    select jsonb_agg(conrelid::regclass || ': ' || conname || ' ' || pg_get_constraintdef(oid) order by conrelid::regclass::text, conname)
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conrelid::regclass::text in ('appointments','services','businesses','business_members','availability','staff_services','time_blocks','booking_links')),
  'indexes', (
    select jsonb_agg(tablename || ': ' || indexdef order by tablename)
    from pg_indexes where schemaname = 'public'
      and tablename in ('appointments','services','businesses','business_members','availability','staff_services','time_blocks','booking_links')),
  'policies', (
    select jsonb_agg(tablename || ': ' || policyname || ' ' || cmd || ' using(' || coalesce(qual, '') || ') check(' || coalesce(with_check, '') || ')' order by tablename)
    from pg_policies where schemaname = 'public'
      and tablename in ('appointments','services','businesses','business_members','availability','staff_services','time_blocks','booking_links')),
  'triggers', (
    select jsonb_agg(event_object_table || ': ' || trigger_name || ' ' || action_timing || ' ' || event_manipulation || ' ' || action_statement order by event_object_table)
    from information_schema.triggers where trigger_schema = 'public'
      and event_object_table in ('appointments','services','businesses','business_members','availability','time_blocks')),
  'functions', (
    select jsonb_object_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', pg_get_functiondef(p.oid))
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('book_appointment','owner_book_appointment','get_available_slots','get_busy_slots','get_business_staff',
                        'reschedule_appointment','reschedule_by_link','cancel_by_link','cancel_my_booking','booking_by_link',
                        'appointments_lifecycle','appointments_guest_guard','appointments_client_update_guard','appointments_link',
                        'booking_notice_payload','send_booking_notice','notify_booking_change','businesses_launch_guard',
                        'is_business_member','is_business_owner','my_member_id','acting_as_client','rate_ok','real_booking_count'))
)) as snapshot;
