#pragma once
#include "pulse/pipeline/operator.hpp"
#include <vector>
#include <functional>
#include <string>
#include <cstdint>
#include <stdexcept>

namespace pulse {

// ---------------------------------------------------------------------------
// BatchOperator — collects events into fixed-size batches and emits them
// when the batch is full or when flush() is called.
// ---------------------------------------------------------------------------
class BatchOperator : public Operator {
public:
    using BatchCallback = std::function<void(const std::vector<Event>&)>;

    /// Construct a BatchOperator.
    /// @param batch_size  Number of events per batch (must be > 0).
    /// @param on_batch    Callback invoked with each completed batch.
    /// @param name        Human-readable name for this operator.
    explicit BatchOperator(size_t batch_size, BatchCallback on_batch,
                           const std::string& name = "batch")
        : batch_size_(batch_size)
        , on_batch_(std::move(on_batch))
        , name_(name) {
        if (batch_size_ == 0) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "BatchOperator: batch_size must be > 0");
        }
        if (!on_batch_) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "BatchOperator: on_batch callback must not be null");
        }
        buffer_.reserve(batch_size_);
    }

    /// Process a single event: buffer it, and emit a batch when full.
    void process(const Event& event) override {
        buffer_.push_back(event.clone());
        total_events_++;

        if (buffer_.size() >= batch_size_) {
            emit_batch();
        }
    }

    /// Flush remaining buffered events as a partial batch.
    void flush() override {
        if (!buffer_.empty()) {
            emit_batch();
        }
        // Propagate flush downstream.
        if (downstream_) {
            downstream_->flush();
        }
    }

    OperatorType type() const override { return OperatorType::Window; }
    std::string name() const override { return name_; }

    // --- Accessors ---
    size_t batch_size() const { return batch_size_; }
    size_t buffered_count() const { return buffer_.size(); }

    // --- Stats ---
    uint64_t batches_emitted() const { return batches_emitted_; }
    uint64_t total_events() const { return total_events_; }

    /// Average events per emitted batch (0.0 if no batches emitted).
    double avg_batch_size() const {
        if (batches_emitted_ == 0) return 0.0;
        return static_cast<double>(total_events_flushed_)
             / static_cast<double>(batches_emitted_);
    }

    /// Reset internal state: clears buffer and zeroes counters.
    void reset() {
        buffer_.clear();
        batches_emitted_ = 0;
        total_events_ = 0;
        total_events_flushed_ = 0;
    }

private:
    void emit_batch() {
        on_batch_(buffer_);

        // Also emit each event downstream if a downstream operator is wired.
        emit_all(buffer_);

        total_events_flushed_ += buffer_.size();
        batches_emitted_++;
        buffer_.clear();
    }

    size_t        batch_size_;
    BatchCallback on_batch_;
    std::string   name_;

    std::vector<Event> buffer_;
    uint64_t batches_emitted_     = 0;
    uint64_t total_events_        = 0;
    uint64_t total_events_flushed_ = 0;
};

} // namespace pulse
