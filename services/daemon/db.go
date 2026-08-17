package main

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	_ "github.com/lib/pq"
)

type DB struct {
	redisClient *redis.Client
	pgClient    *sql.DB
}

func NewDB(redisAddr, pgConnStr string) *DB {
	// Redis setup
	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Postgres setup
	pdb, err := sql.Open("postgres", pgConnStr)
	if err != nil {
		log.Fatalf("Failed to open Postgres: %v", err)
	}

	db := &DB{
		redisClient: rdb,
		pgClient:    pdb,
	}

	db.initSchema()
	return db
}

func (db *DB) initSchema() {
	query := `
	CREATE TABLE IF NOT EXISTS system_metrics (
		id SERIAL PRIMARY KEY,
		timestamp BIGINT NOT NULL,
		cpu_usage_percent DOUBLE PRECISION NOT NULL,
		ram_used_percent DOUBLE PRECISION NOT NULL,
		gpu_utilization DOUBLE PRECISION NOT NULL,
		gpu_vram_used BIGINT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.pgClient.Exec(query)
	if err != nil {
		log.Fatalf("Failed to initialize Postgres schema: %v", err)
	}
	log.Println("Postgres schema initialized")
}

func (db *DB) UpdateRedisMetrics(ctx context.Context, payloadBytes []byte) error {
	// Write to latest snapshot with 5s TTL
	err := db.redisClient.Set(ctx, "metrics:latest", payloadBytes, 5*time.Second).Err()
	if err != nil {
		return err
	}

	// Publish to stream
	return db.redisClient.Publish(ctx, "metrics:stream", payloadBytes).Err()
}

func (db *DB) BatchInsertPostgres(metrics []TelemetryPayload) error {
	if len(metrics) == 0 {
		return nil
	}

	// In a production app, use bulk insert (e.g. COPY or batched VALUES)
	// For simplicity, we use a transaction with standard inserts
	tx, err := db.pgClient.Begin()
	if err != nil {
		return err
	}

	stmt, err := tx.Prepare(`INSERT INTO system_metrics (timestamp, cpu_usage_percent, ram_used_percent, gpu_utilization, gpu_vram_used) VALUES ($1, $2, $3, $4, $5)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, m := range metrics {
		_, err := stmt.Exec(m.Timestamp, m.CPU.UsagePercent, m.RAM.UsedPercent, m.GPU.Utilization, m.GPU.VRAMUsed)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func (db *DB) Close() {
	db.redisClient.Close()
	db.pgClient.Close()
}
