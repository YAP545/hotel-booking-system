import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1732600000000 implements MigrationInterface {
  name = 'InitialSchema1732600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('ADMIN','RECEPTIONIST','CUSTOMER') NOT NULL DEFAULT 'RECEPTIONIST',
        phone VARCHAR(50) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_users_email (email)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE room_types (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        capacity INT NOT NULL,
        base_price DECIMAL(10,2) NOT NULL,
        amenities JSON NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_room_types_name (name)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE rooms (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        room_number VARCHAR(50) NOT NULL,
        room_type_id VARCHAR(36) NOT NULL,
        floor INT NOT NULL,
        status ENUM('AVAILABLE','RESERVED','OCCUPIED','CLEANING','MAINTENANCE','OUT_OF_SERVICE') NOT NULL DEFAULT 'AVAILABLE',
        price DECIMAL(10,2) NULL,
        description TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_rooms_room_number (room_number),
        KEY idx_rooms_status (status),
        CONSTRAINT fk_rooms_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE guests (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NULL,
        phone VARCHAR(50) NOT NULL,
        address VARCHAR(255) NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(100) NULL,
        country VARCHAR(100) NULL,
        id_proof_type VARCHAR(50) NULL,
        id_proof_number VARCHAR(100) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_guests_email (email),
        KEY idx_guests_phone (phone)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE reservations (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        booking_reference VARCHAR(50) NOT NULL,
        group_reference VARCHAR(50) NULL,
        guest_id VARCHAR(36) NOT NULL,
        room_id VARCHAR(36) NOT NULL,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        number_of_guests INT NOT NULL DEFAULT 1,
        booking_status ENUM('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','NO_SHOW') NOT NULL DEFAULT 'PENDING',
        special_requests TEXT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_reservations_booking_reference (booking_reference),
        KEY idx_reservations_status (booking_status),
        KEY idx_reservations_room_dates (room_id, check_in_date, check_out_date),
        CONSTRAINT fk_reservations_guest FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE RESTRICT,
        CONSTRAINT fk_reservations_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE payments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        reservation_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('CASH','CARD','UPI','BANK_TRANSFER','RAZORPAY') NOT NULL,

        payment_status ENUM('PENDING','PARTIAL','PAID','REFUNDED') NOT NULL DEFAULT 'PAID',
        transaction_reference VARCHAR(100) NULL,
        paid_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_payments_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE invoices (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        reservation_id VARCHAR(36) NOT NULL,
        invoice_number VARCHAR(50) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        issued_at DATETIME NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_invoices_invoice_number (invoice_number),
        CONSTRAINT fk_invoices_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE cancellations (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        reservation_id VARCHAR(36) NOT NULL,
        reason TEXT NOT NULL,
        cancellation_date DATETIME NOT NULL,
        cancellation_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        refund_amount DECIMAL(10,2) NOT NULL,
        status ENUM('REQUESTED','APPROVED','REFUNDED') NOT NULL DEFAULT 'APPROVED',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_cancellations_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE check_ins (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        reservation_id VARCHAR(36) NOT NULL,
        room_id VARCHAR(36) NOT NULL,
        check_in_time DATETIME NOT NULL,
        checked_in_by VARCHAR(36) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_check_ins_reservation (reservation_id),
        CONSTRAINT fk_check_ins_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
        CONSTRAINT fk_check_ins_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
        CONSTRAINT fk_check_ins_user FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE check_outs (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        reservation_id VARCHAR(36) NOT NULL,
        room_id VARCHAR(36) NOT NULL,
        check_out_time DATETIME NOT NULL,
        final_amount DECIMAL(10,2) NOT NULL,
        checked_out_by VARCHAR(36) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_check_outs_reservation (reservation_id),
        CONSTRAINT fk_check_outs_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
        CONSTRAINT fk_check_outs_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
        CONSTRAINT fk_check_outs_user FOREIGN KEY (checked_out_by) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NULL,
        user_name VARCHAR(255) NULL,
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE hotel_settings (
        id INT PRIMARY KEY,
        hotel_name VARCHAR(255) NOT NULL DEFAULT 'Grand Hotel',
        tax_percent DECIMAL(5,2) NOT NULL DEFAULT 12.00,
        cancellation_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
        free_cancellation_hours INT NOT NULL DEFAULT 48,
        check_in_time VARCHAR(10) NOT NULL DEFAULT '14:00',
        check_out_time VARCHAR(10) NOT NULL DEFAULT '11:00',
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hotel_settings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS check_outs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS check_ins;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cancellations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoices;`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS reservations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS guests;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rooms;`);
    await queryRunner.query(`DROP TABLE IF EXISTS room_types;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
  }
}
