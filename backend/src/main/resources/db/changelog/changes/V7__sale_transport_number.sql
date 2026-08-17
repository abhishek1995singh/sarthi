-- Optional vehicle / lorry number for sales (same idea as purchase.transport_number)
ALTER TABLE sale
    ADD COLUMN transport_number VARCHAR(50);
