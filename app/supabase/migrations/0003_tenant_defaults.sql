-- Preenche automaticamente as colunas de tenant/autor nos inserts, então o
-- cliente não precisa (e não deveria) enviar account_id/broker_id/author_id
-- manualmente — evita erro e tentativa de spoof, já que RLS também confere.

create or replace function set_tenant_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.account_id is null then
    new.account_id := current_account_id();
  end if;
  return new;
end;
$$;

create trigger leads_set_tenant before insert on leads for each row execute function set_tenant_column();
create trigger notes_set_tenant before insert on notes for each row execute function set_tenant_column();
create trigger reminders_set_tenant before insert on reminders for each row execute function set_tenant_column();
create trigger conversation_messages_set_tenant before insert on conversation_messages for each row execute function set_tenant_column();

create or replace function set_broker_id()
returns trigger language plpgsql as $$
begin
  if new.broker_id is null then
    new.broker_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger leads_set_broker before insert on leads for each row execute function set_broker_id();

create or replace function set_author_id()
returns trigger language plpgsql as $$
begin
  if new.author_id is null then
    new.author_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger notes_set_author before insert on notes for each row execute function set_author_id();
create trigger conversation_messages_set_author before insert on conversation_messages for each row execute function set_author_id();
