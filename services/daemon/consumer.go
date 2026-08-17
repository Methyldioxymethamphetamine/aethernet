package main

import (
	"context"
	"log"
	"time"
    "encoding/json"

	"github.com/segmentio/kafka-go"
)

func StartConsumerLoop(brokers []string, db *DB) {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers: brokers,
		Topic:   "telemetry.raw",
		GroupID: "aethernet-consumer-group",
		MinBytes: 10e3, // 10KB
		MaxBytes: 10e6, // 10MB
	})

	log.Println("Starting metrics consumer loop")

	batch := make([]TelemetryPayload, 0)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if len(batch) > 0 {
				err := db.BatchInsertPostgres(batch)
				if err != nil {
					log.Printf("Failed to batch insert Postgres: %v", err)
				} else {
					log.Printf("Successfully batch inserted %d metrics to Postgres", len(batch))
				}
				batch = make([]TelemetryPayload, 0) // reset batch
			}
		default:
			ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
			m, err := r.ReadMessage(ctx)
			cancel()

			if err != nil {
				if err == context.DeadlineExceeded {
					continue
				}
				log.Printf("Error reading kafka message: %v", err)
				continue
			}

			// Update Redis (Latest Snapshot + PubSub Stream)
			err = db.UpdateRedisMetrics(context.Background(), m.Value)
			if err != nil {
				log.Printf("Error updating Redis: %v", err)
			}

			// Parse payload for Postgres batching
			var payload TelemetryPayload
			if err := json.Unmarshal(m.Value, &payload); err == nil {
				batch = append(batch, payload)
			} else {
				log.Printf("Failed to parse telemetry payload: %v", err)
			}
		}
	}
}
