#pragma once
#include "pulse/pipeline/operator.hpp"
#include "pulse/window/tumbling_window.hpp"
#include "pulse/aggregator/aggregator.hpp"
#include <vector>
#include <memory>
#include <string>
#include <functional>

namespace pulse {

class Pipeline {
public:
    Pipeline(const std::string& name = "pipeline");

    Pipeline& filter(std::function<bool(const Event&)> pred,
                     const std::string& name = "filter");
    Pipeline& map(std::function<Event(const Event&)> fn,
                  const std::string& name = "map");
    Pipeline& sink(std::function<void(const Event&)> fn,
                   const std::string& name = "sink");

    void process(const Event& event);
    void flush();

    const std::string& name() const { return name_; }
    size_t operator_count() const { return operators_.size(); }
    uint64_t events_in() const { return events_in_; }

    std::vector<std::string> operator_names() const;

private:
    std::string name_;
    std::vector<std::shared_ptr<Operator>> operators_;
    uint64_t events_in_ = 0;
};

class PipelineBuilder {
public:
    PipelineBuilder(const std::string& name = "pipeline");

    PipelineBuilder& filter(std::function<bool(const Event&)> pred,
                            const std::string& name = "filter");
    PipelineBuilder& map(std::function<Event(const Event&)> fn,
                         const std::string& name = "map");
    PipelineBuilder& sink(std::function<void(const Event&)> fn,
                          const std::string& name = "sink");

    Pipeline build();

private:
    std::string name_;
    struct OpSpec {
        enum Type { FILTER, MAP, SINK } type;
        std::function<bool(const Event&)> filter_fn;
        std::function<Event(const Event&)> map_fn;
        std::function<void(const Event&)> sink_fn;
        std::string name;
    };
    std::vector<OpSpec> specs_;
};

} // namespace pulse