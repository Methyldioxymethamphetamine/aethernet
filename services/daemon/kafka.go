package main

import (
	"context"
	"log"

	"github.com/segmentio/kafka-go"
)

type KafkaProducer struct {
	writer *kafka.Writer
}

func NewKafkaProducer(brokers []string) *KafkaProducer {
	w := &kafka.Writer{
		Addr:     kafka.TCP(brokers...),
		Balancer: &kafka.LeastBytes{},
	}
	return &KafkaProducer{writer: w}
}

func (p *KafkaProducer) Publish(topic string, value []byte) error {
	msg := kafka.Message{
		Topic: topic,
		Value: value,
	}
	return p.writer.WriteMessages(context.Background(), msg)
}

func (p *KafkaProducer) Close() {
	if err := p.writer.Close(); err != nil {
		log.Printf("Error closing Kafka producer: %v", err)
	}
}
