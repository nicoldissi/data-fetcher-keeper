-- Add voltage and frequency columns to energy_data
ALTER TABLE energy_data
    ADD COLUMN voltage NUMERIC,
    ADD COLUMN frequency NUMERIC;

-- Add indexes for performance optimization
CREATE INDEX idx_energy_data_voltage ON energy_data(voltage);
CREATE INDEX idx_energy_data_frequency ON energy_data(frequency);