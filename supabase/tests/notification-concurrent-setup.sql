insert into public.motors(id,name,type,description,daily_rate_centavos)
values('e3000000-0000-0000-0000-000000000001','Concurrent notification motor','Scooter','Test',10000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
select 'e3100000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','Concurrent notification motor',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,10000,'approved',s,s+interval '24 hours',20000 from (select now()+interval '1 hour' as s) f;
insert into public.notifications(id,recipient_id,audience,booking_id,kind,title,body)
values('e3200000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','client','e3100000-0000-0000-0000-000000000001','approved','Booking approved','Concurrent test alert');
