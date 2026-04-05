ALTER TABLE public.lancamentos_financeiros_itens
ADD COLUMN IF NOT EXISTS cliente_id uuid;

CREATE INDEX IF NOT EXISTS idx_lancamentos_financeiros_itens_cliente_id
ON public.lancamentos_financeiros_itens (cliente_id);

CREATE OR REPLACE FUNCTION public.sync_lancamento_item_cliente_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lancamento_id IS NULL THEN
    NEW.cliente_id := NULL;
    RETURN NEW;
  END IF;

  SELECT lf.cliente_id
    INTO NEW.cliente_id
  FROM public.lancamentos_financeiros lf
  WHERE lf.id = NEW.lancamento_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lancamento_item_cliente_id ON public.lancamentos_financeiros_itens;

CREATE TRIGGER trg_sync_lancamento_item_cliente_id
BEFORE INSERT OR UPDATE OF lancamento_id
ON public.lancamentos_financeiros_itens
FOR EACH ROW
EXECUTE FUNCTION public.sync_lancamento_item_cliente_id();

UPDATE public.lancamentos_financeiros_itens li
SET cliente_id = lf.cliente_id
FROM public.lancamentos_financeiros lf
WHERE lf.id = li.lancamento_id
  AND li.cliente_id IS DISTINCT FROM lf.cliente_id;