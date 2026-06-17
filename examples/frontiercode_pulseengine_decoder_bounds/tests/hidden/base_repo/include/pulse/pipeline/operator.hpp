#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <functional>
#include <string>
#include <memory>

namespace pulse {

enum class OperatorType {
    Filter,
    Map,
    FlatMap,
    Sink,
    Window,
    Aggregate
};

class Operator {
public:
    virtual ~Operator() = default;
    virtual void process(const Event& event) = 0;
    virtual void flush() {}
    virtual OperatorType type() const = 0;
    virtual std::string name() const = 0;

    void set_downstream(std::shared_ptr<Operator> next) { downstream_ = std::move(next); }

protected:
    void emit(const Event& event) {
        if (downstream_) downstream_->process(event);
    }
    void emit_all(const std::vector<Event>& events) {
        if (downstream_) {
            for (const auto& e : events) downstream_->process(e);
        }
    }

    std::shared_ptr<Operator> downstream_;
};

class FilterOperator : public Operator {
public:
    using Pred = std::function<bool(const Event&)>;
    explicit FilterOperator(Pred pred, const std::string& name = "filter")
        : pred_(std::move(pred)), name_(name) {}

    void process(const Event& event) override {
        if (pred_(event)) { passed_++; emit(event); }
        else { dropped_++; }
        total_++;
    }
    OperatorType type() const override { return OperatorType::Filter; }
    std::string name() const override { return name_; }

    uint64_t passed() const { return passed_; }
    uint64_t dropped() const { return dropped_; }
    uint64_t total() const { return total_; }

private:
    Pred pred_;
    std::string name_;
    uint64_t passed_ = 0, dropped_ = 0, total_ = 0;
};

class MapOperator : public Operator {
public:
    using Transform = std::function<Event(const Event&)>;
    explicit MapOperator(Transform fn, const std::string& name = "map")
        : fn_(std::move(fn)), name_(name) {}

    void process(const Event& event) override {
        emit(fn_(event));
    }
    OperatorType type() const override { return OperatorType::Map; }
    std::string name() const override { return name_; }

private:
    Transform fn_;
    std::string name_;
};

class SinkOperator : public Operator {
public:
    using SinkFn = std::function<void(const Event&)>;
    explicit SinkOperator(SinkFn fn, const std::string& name = "sink")
        : fn_(std::move(fn)), name_(name) {}

    void process(const Event& event) override {
        fn_(event);
        count_++;
    }
    OperatorType type() const override { return OperatorType::Sink; }
    std::string name() const override { return name_; }
    uint64_t count() const { return count_; }

private:
    SinkFn fn_;
    std::string name_;
    uint64_t count_ = 0;
};

} // namespace pulse