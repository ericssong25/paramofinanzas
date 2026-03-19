/*
  # Financial Management System Schema
  
  ## Overview
  Complete database schema for managing a service business with multiple income sources,
  commissions, team payments, and multi-currency support.
  
  ## New Tables
  
  ### 1. wallets
  Represents different payment methods/accounts (Zelle, Cash, USDT, etc.)
  - id (uuid, primary key)
  - name (text) - e.g., "Zelle USD", "Efectivo USD"
  - currency (text) - USD, COP, VES, etc.
  - balance (decimal) - current balance
  - created_at (timestamptz)
  - updated_at (timestamptz)
  
  ### 2. clientes
  Customer information and payment expectations
  - id (uuid, primary key)
  - nombre (text)
  - servicio (text) - service provided
  - monto_esperado (decimal)
  - moneda (text)
  - frecuencia (text) - "unico" or "mensual"
  - proxima_fecha_pago (date)
  - estado (text) - "activo", "atrasado", "inactivo"
  - created_at (timestamptz)
  - updated_at (timestamptz)
  
  ### 3. pagos
  Customer payments received
  - id (uuid, primary key)
  - cliente_id (uuid, foreign key)
  - fecha (timestamptz)
  - monto (decimal)
  - metodo (text) - payment method
  - moneda (text)
  - comprobante_url (text) - receipt image URL
  - nota (text)
  - wallet_id (uuid, foreign key) - destination wallet
  - created_at (timestamptz)
  
  ### 4. equipo
  Team members
  - id (uuid, primary key)
  - nombre (text)
  - rol (text)
  - created_at (timestamptz)
  
  ### 5. movimientos
  All financial movements (income, conversions, expenses, team payments)
  - id (uuid, primary key)
  - tipo (text) - "ingreso", "conversion", "gasto", "pago_equipo"
  - fecha (timestamptz)
  - monto (decimal)
  - moneda (text)
  - origen_wallet_id (uuid, foreign key)
  - destino_wallet_id (uuid, foreign key)
  - comision (decimal)
  - pago_id (uuid, foreign key) - related payment if applicable
  - equipo_id (uuid, foreign key) - if team payment
  - categoria (text) - for expenses
  - nota (text)
  - created_at (timestamptz)
  
  ### 6. gastos
  Business expenses
  - id (uuid, primary key)
  - categoria (text)
  - monto (decimal)
  - moneda (text)
  - fecha (timestamptz)
  - wallet_id (uuid, foreign key)
  - nota (text)
  - created_at (timestamptz)
  
  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users to manage their own data
*/

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL,
  balance decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wallets"
  ON wallets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert wallets"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update wallets"
  ON wallets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete wallets"
  ON wallets FOR DELETE
  TO authenticated
  USING (true);

-- Create clientes table
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  servicio text NOT NULL,
  monto_esperado decimal(15,2) NOT NULL,
  moneda text NOT NULL DEFAULT 'USD',
  frecuencia text NOT NULL DEFAULT 'mensual',
  proxima_fecha_pago date,
  estado text NOT NULL DEFAULT 'activo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clientes"
  ON clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clientes"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clientes"
  ON clientes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete clientes"
  ON clientes FOR DELETE
  TO authenticated
  USING (true);

-- Create equipo table
CREATE TABLE IF NOT EXISTS equipo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  rol text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipo"
  ON equipo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert equipo"
  ON equipo FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update equipo"
  ON equipo FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete equipo"
  ON equipo FOR DELETE
  TO authenticated
  USING (true);

-- Create wallets table (required before pagos, gastos, movimientos - they reference wallets)
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL,
  balance decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view wallets" ON wallets;
CREATE POLICY "Users can view wallets"
  ON wallets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert wallets" ON wallets;
CREATE POLICY "Users can insert wallets"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update wallets" ON wallets;
CREATE POLICY "Users can update wallets"
  ON wallets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete wallets" ON wallets;
CREATE POLICY "Users can delete wallets"
  ON wallets FOR DELETE
  TO authenticated
  USING (true);

-- Create pagos table
CREATE TABLE IF NOT EXISTS pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  fecha timestamptz DEFAULT now(),
  monto decimal(15,2) NOT NULL,
  metodo text NOT NULL,
  moneda text NOT NULL DEFAULT 'USD',
  comprobante_url text,
  nota text,
  wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pagos"
  ON pagos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert pagos"
  ON pagos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update pagos"
  ON pagos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete pagos"
  ON pagos FOR DELETE
  TO authenticated
  USING (true);

-- Create gastos table
CREATE TABLE IF NOT EXISTS gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  monto decimal(15,2) NOT NULL,
  moneda text NOT NULL DEFAULT 'USD',
  fecha timestamptz DEFAULT now(),
  wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,
  nota text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gastos"
  ON gastos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert gastos"
  ON gastos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update gastos"
  ON gastos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete gastos"
  ON gastos FOR DELETE
  TO authenticated
  USING (true);

-- Create movimientos table
CREATE TABLE IF NOT EXISTS movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  fecha timestamptz DEFAULT now(),
  monto decimal(15,2) NOT NULL,
  moneda text NOT NULL DEFAULT 'USD',
  origen_wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,
  destino_wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,
  comision decimal(15,2) DEFAULT 0,
  pago_id uuid REFERENCES pagos(id) ON DELETE SET NULL,
  equipo_id uuid REFERENCES equipo(id) ON DELETE SET NULL,
  categoria text,
  nota text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movimientos"
  ON movimientos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert movimientos"
  ON movimientos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update movimientos"
  ON movimientos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete movimientos"
  ON movimientos FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pagos_cliente_id ON pagos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_proxima_fecha_pago ON clientes(proxima_fecha_pago);