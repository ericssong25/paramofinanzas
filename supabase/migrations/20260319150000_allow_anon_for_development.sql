/*
  Allow anonymous access for development/testing.
  The app currently uses the anon key without Supabase Auth.
  
  IMPORTANT: For production, you should:
  1. Enable Supabase Auth (email, magic link, etc.)
  2. Remove these anon policies
  3. Use the existing "authenticated" policies
*/

-- Wallets
CREATE POLICY "Anon can view wallets"
  ON wallets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert wallets"
  ON wallets FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update wallets"
  ON wallets FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete wallets"
  ON wallets FOR DELETE
  TO anon
  USING (true);

-- Clientes
CREATE POLICY "Anon can view clientes"
  ON clientes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert clientes"
  ON clientes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update clientes"
  ON clientes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete clientes"
  ON clientes FOR DELETE
  TO anon
  USING (true);

-- Equipo
CREATE POLICY "Anon can view equipo"
  ON equipo FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert equipo"
  ON equipo FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update equipo"
  ON equipo FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete equipo"
  ON equipo FOR DELETE
  TO anon
  USING (true);

-- Pagos
CREATE POLICY "Anon can view pagos"
  ON pagos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert pagos"
  ON pagos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update pagos"
  ON pagos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete pagos"
  ON pagos FOR DELETE
  TO anon
  USING (true);

-- Gastos
CREATE POLICY "Anon can view gastos"
  ON gastos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert gastos"
  ON gastos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update gastos"
  ON gastos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete gastos"
  ON gastos FOR DELETE
  TO anon
  USING (true);

-- Movimientos
CREATE POLICY "Anon can view movimientos"
  ON movimientos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert movimientos"
  ON movimientos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update movimientos"
  ON movimientos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete movimientos"
  ON movimientos FOR DELETE
  TO anon
  USING (true);
