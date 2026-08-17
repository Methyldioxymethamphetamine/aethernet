package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	log.Println("Starting AetherNet Daemon")

	// Configuration (In production, use environment variables)
	kafkaBrokers := []string{"localhost:9092"}
	redisAddr := "localhost:6379"
	pgConnStr := "user=postgres password=postgres dbname=aethernet sslmode=disable host=localhost"

	// Initialize Database
	db := NewDB(redisAddr, pgConnStr)
	defer db.Close()

	// Initialize Kafka Producer
	producer := NewKafkaProducer(kafkaBrokers)
	defer producer.Close()

	// Start Collector Loop (Goroutine)
	go StartCollectorLoop(producer)

	// Start Consumer Loop (Goroutine)
	go StartConsumerLoop(kafkaBrokers, db)

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down AetherNet Daemon")
}
