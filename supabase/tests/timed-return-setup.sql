insert into public.motors(id,name,type,description,daily_rate_centavos)
values('d0000000-0000-0000-0000-000000000002','Concurrent late return','Scooter','Test',10000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos,picked_up_at)
select 'd1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','Concurrent late return',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,10000,'in_use',s,s+interval '24 hours',20000,s
from (select now()-interval '30 hours 10 minutes' as s) fixture;
