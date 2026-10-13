-- 007_battle_lifecycle_recovery.sql

-- 1. Atomic Battle Startup with Stale Host Migration Guard
CREATE OR REPLACE FUNCTION public.start_battle_atomic(
  p_battle_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_battle RECORD;
  v_host_player RECORD;
  v_active_host UUID;
  v_player_count INTEGER;
BEGIN
  -- 1. Lock battle row for update to serialize state transitions
  SELECT * INTO v_battle
  FROM public.battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found', 'status_code', 404);
  END IF;

  -- Only permit starting a battle in 'waiting' status
  IF v_battle.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle has already started or finished', 'status_code', 400);
  END IF;

  -- 2. Verify requesting user is an active participant in this battle
  IF NOT EXISTS (
    SELECT 1 FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: not a participant of this battle', 'status_code', 403);
  END IF;

  -- 3. Check player requirements
  SELECT COUNT(*) INTO v_player_count
  FROM public.battle_players
  WHERE battle_id = p_battle_id;

  IF v_player_count < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough players to start', 'status_code', 400);
  END IF;

  -- 4. Host verification / Server-validated stale host migration
  v_active_host := v_battle.host_id;
  IF v_active_host != p_user_id THEN
    -- Check if current host is stale (> 45s since last ping)
    SELECT last_ping_at INTO v_host_player
    FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = v_active_host;

    IF v_host_player.last_ping_at IS NULL OR (NOW() - v_host_player.last_ping_at) > interval '45 seconds' THEN
      -- Migrate host authority to the active requesting participant
      v_active_host := p_user_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Only the active host can start the battle', 'status_code', 403);
    END IF;
  END IF;

  -- 5. Atomically transition battle to playing and initialize round 1 timer
  UPDATE public.battles
  SET status = 'playing',
      host_id = v_active_host
  WHERE id = p_battle_id;

  UPDATE public.battle_rounds
  SET started_at = NOW(),
      status = 'guessing',
      revealed_at = NULL
  WHERE battle_id = p_battle_id AND round_number = 1;

  RETURN jsonb_build_object(
    'success', true,
    'battle_id', p_battle_id,
    'host_id', v_active_host
  );
END;
$$;

-- 2. Atomic Round Advancement with Concurrency Control and Stale Host Recovery
CREATE OR REPLACE FUNCTION public.advance_battle_round_atomic(
  p_battle_id UUID,
  p_user_id UUID,
  p_expected_round INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_battle RECORD;
  v_current_round RECORD;
  v_host_player RECORD;
  v_active_host UUID;
  v_next_round_number INTEGER;
BEGIN
  -- 1. Lock battle row for update to serialize advancement requests
  SELECT * INTO v_battle
  FROM public.battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found', 'status_code', 404);
  END IF;

  IF v_battle.status != 'playing' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle is not in playing status', 'status_code', 400);
  END IF;

  -- 2. Verify requesting user is an active participant
  IF NOT EXISTS (
    SELECT 1 FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: not a participant of this battle', 'status_code', 403);
  END IF;

  -- 3. Concurrency Protection: if expected round was provided and does not match, return idempotent success
  IF p_expected_round IS NOT NULL AND v_battle.current_round != p_expected_round THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_advanced', true,
      'current_round', v_battle.current_round,
      'status', v_battle.status
    );
  END IF;

  -- 4. Verify current round exists and has status = 'revealed'
  SELECT * INTO v_current_round
  FROM public.battle_rounds
  WHERE battle_id = p_battle_id AND round_number = v_battle.current_round;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current round not found', 'status_code', 404);
  END IF;

  IF v_current_round.status != 'revealed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current round must be revealed before advancing', 'status_code', 400);
  END IF;

  -- 5. Host verification / Host migration
  v_active_host := v_battle.host_id;
  IF v_active_host != p_user_id THEN
    -- Check if current host is stale (> 45s since last ping)
    SELECT last_ping_at INTO v_host_player
    FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = v_active_host;

    IF v_host_player.last_ping_at IS NULL OR (NOW() - v_host_player.last_ping_at) > interval '45 seconds' THEN
      v_active_host := p_user_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Only the active host can advance the round', 'status_code', 403);
    END IF;
  END IF;

  -- 6. Check if final round reached
  IF v_battle.current_round >= v_battle.max_rounds THEN
    UPDATE public.battles
    SET status = 'finished',
        host_id = v_active_host
    WHERE id = p_battle_id;

    RETURN jsonb_build_object(
      'success', true,
      'finished', true,
      'current_round', v_battle.current_round,
      'host_id', v_active_host
    );
  END IF;

  -- 7. Advance to next round atomically
  v_next_round_number := v_battle.current_round + 1;

  IF NOT EXISTS (
    SELECT 1 FROM public.battle_rounds
    WHERE battle_id = p_battle_id AND round_number = v_next_round_number
  ) THEN
    -- Fallback safety: if next round configuration is missing, finish match
    UPDATE public.battles
    SET status = 'finished',
        host_id = v_active_host
    WHERE id = p_battle_id;

    RETURN jsonb_build_object(
      'success', true,
      'finished', true,
      'current_round', v_battle.current_round,
      'host_id', v_active_host
    );
  END IF;

  UPDATE public.battles
  SET current_round = v_next_round_number,
      host_id = v_active_host
  WHERE id = p_battle_id;

  UPDATE public.battle_rounds
  SET started_at = NOW(),
      status = 'guessing',
      revealed_at = NULL
  WHERE battle_id = p_battle_id AND round_number = v_next_round_number;

  RETURN jsonb_build_object(
    'success', true,
    'finished', false,
    'current_round', v_next_round_number,
    'host_id', v_active_host
  );
END;
$$;

-- 3. Dedicated Host Claim RPC Function
CREATE OR REPLACE FUNCTION public.claim_battle_host_atomic(
  p_battle_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_battle RECORD;
  v_host_player RECORD;
BEGIN
  SELECT * INTO v_battle
  FROM public.battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found', 'status_code', 404);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: not a participant of this battle', 'status_code', 403);
  END IF;

  IF v_battle.host_id = p_user_id THEN
    RETURN jsonb_build_object('success', true, 'host_id', p_user_id);
  END IF;

  SELECT last_ping_at INTO v_host_player
  FROM public.battle_players
  WHERE battle_id = p_battle_id AND user_id = v_battle.host_id;

  IF v_host_player.last_ping_at IS NOT NULL AND (NOW() - v_host_player.last_ping_at) <= interval '45 seconds' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Host is currently active', 'status_code', 403);
  END IF;

  UPDATE public.battles
  SET host_id = p_user_id
  WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'host_id', p_user_id);
END;
$$;

-- Restrict unnecessary execution privileges
REVOKE ALL ON FUNCTION public.start_battle_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_battle_atomic(UUID, UUID) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.advance_battle_round_atomic(UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_battle_round_atomic(UUID, UUID, INTEGER) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.claim_battle_host_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_battle_host_atomic(UUID, UUID) TO postgres, service_role;
