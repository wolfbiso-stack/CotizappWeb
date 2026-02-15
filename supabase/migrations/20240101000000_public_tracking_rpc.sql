CREATE OR REPLACE FUNCTION get_service_by_token(token_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    -- Check servicios_pc
    SELECT to_json(t) INTO result FROM servicios_pc t WHERE token = token_input;
    IF result IS NOT NULL THEN
        RETURN result;
    END IF;

    -- Check servicios_impresoras
    SELECT to_json(t) INTO result FROM servicios_impresoras t WHERE token = token_input;
    IF result IS NOT NULL THEN
        RETURN result;
    END IF;

    -- Check servicios_celulares
    SELECT to_json(t) INTO result FROM servicios_celulares t WHERE token = token_input;
    IF result IS NOT NULL THEN
        RETURN result;
    END IF;
    
    RETURN null;
END;
$$;

-- Grant execute to public/anon
GRANT EXECUTE ON FUNCTION get_service_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_service_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_by_token(text) TO service_role;