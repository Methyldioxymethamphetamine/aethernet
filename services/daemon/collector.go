package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

// TelemetryPayload represents the full system snapshot
type TelemetryPayload struct {
	Timestamp int64       `json:"timestamp"`
	CPU       CPUStats    `json:"cpu"`
	RAM       RAMStats    `json:"ram"`
	Disk      DiskStats   `json:"disk"`
	GPU       GPUStats    `json:"gpu"` // Optional/Stubbed if no NVML
}

type CPUStats struct {
	UsagePercent float64   `json:"usage_percent"`
	PerCoreLoad  []float64 `json:"per_core_load"`
}

type RAMStats struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"used_percent"`
}

type DiskStats struct {
	ReadBytes  uint64 `json:"read_bytes"`
	WriteBytes uint64 `json:"write_bytes"`
}

type GPUStats struct {
	Detected    bool    `json:"detected"`
	Utilization float64 `json:"utilization"`
	VRAMUsed    uint64  `json:"vram_used"`
	VRAMTotal   uint64  `json:"vram_total"`
	Temperature float64 `json:"temperature"`
}

var lastDiskRead uint64
var lastDiskWrite uint64

// CollectMetrics returns a populated TelemetryPayload
func CollectMetrics() TelemetryPayload {
	now := time.Now().UnixMilli()

	// CPU
	cpuPercent, _ := cpu.Percent(0, false)
	perCore, _ := cpu.Percent(0, true)
	overallCpu := 0.0
	if len(cpuPercent) > 0 {
		overallCpu = cpuPercent[0]
	}

	// RAM
	vmem, _ := mem.VirtualMemory()

	// Disk I/O (simple delta)
	ioCounters, _ := disk.IOCounters()
	var currentRead, currentWrite uint64
	for _, ioc := range ioCounters {
		currentRead += ioc.ReadBytes
		currentWrite += ioc.WriteBytes
	}
	
	readDiff := currentRead - lastDiskRead
	writeDiff := currentWrite - lastDiskWrite
	
	if lastDiskRead == 0 { // First run init
		readDiff = 0
		writeDiff = 0
	}
	
	lastDiskRead = currentRead
	lastDiskWrite = currentWrite

	// Stubbed GPU
	gpu := getGPUStats()

	payload := TelemetryPayload{
		Timestamp: now,
		CPU: CPUStats{
			UsagePercent: overallCpu,
			PerCoreLoad:  perCore,
		},
		RAM: RAMStats{
			Total:       vmem.Total,
			Used:        vmem.Used,
			UsedPercent: vmem.UsedPercent,
		},
		Disk: DiskStats{
			ReadBytes:  readDiff,
			WriteBytes: writeDiff,
		},
		GPU: gpu,
	}

	return payload
}

// getGPUStats acts as a stub for NVIDIA NVML
func getGPUStats() GPUStats {
	// In a real environment, we would use github.com/NVIDIA/go-nvml
	return GPUStats{
		Detected:    false,
		Utilization: 0.0,
		VRAMUsed:    0,
		VRAMTotal:   0,
		Temperature: 0.0,
	}
}

// StartCollectorLoop continuously collects metrics and publishes them to Kafka
func StartCollectorLoop(producer *KafkaProducer) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	log.Println("Starting metrics collector loop (100ms intervals)")

	for range ticker.C {
		payload := CollectMetrics()
		b, err := json.Marshal(payload)
		if err != nil {
			log.Printf("Failed to marshal metrics: %v", err)
			continue
		}

		err = producer.Publish("telemetry.raw", b)
		if err != nil {
			log.Printf("Failed to publish metrics to Kafka: %v", err)
		}
	}
}
