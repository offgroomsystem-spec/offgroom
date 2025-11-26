-- Update handle_new_user function to automatically assign owner role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, nome_completo, email_hotmart, whatsapp)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome_completo', ''),
    COALESCE(new.raw_user_meta_data->>'email_hotmart', new.email),
    COALESCE(new.raw_user_meta_data->>'whatsapp', '')
  );
  
  -- Automatically assign owner role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'owner');
  
  RETURN new;
END;
$$;