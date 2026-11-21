insert into public.motors(id,name,type,description,daily_rate_centavos)
values ('80000000-0000-0000-0000-000000000001','Cancellation race','Scooter','Test',10000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
values ('81000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','Cancellation race',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+2,10000,'approved');
