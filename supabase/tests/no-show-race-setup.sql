insert into public.motors(id,name,type,description,daily_rate_centavos)
values ('b0000000-0000-0000-0000-000000000001','No-show race','Scooter','Test',10000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
values ('b1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','No-show race',(now() at time zone 'Asia/Manila')::date-1,(now() at time zone 'Asia/Manila')::date+1,10000,'approved');
