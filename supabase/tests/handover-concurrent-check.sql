do $$ begin
  if not exists(select 1 from public.bookings where id='51000000-0000-0000-0000-000000000001'
    and status='completed' and picked_up_at is not null and returned_at >= picked_up_at
    and picked_up_by='00000000-0000-0000-0000-000000000003'
    and returned_by='00000000-0000-0000-0000-000000000003' and total_centavos=20000) then
    raise exception 'Concurrent handover retry lost lifecycle state or audit';
  end if;
end $$;
select 'Concurrent pickup/return retries preserved one completed rental.' as result;
