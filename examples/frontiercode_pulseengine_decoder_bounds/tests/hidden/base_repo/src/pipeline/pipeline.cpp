#include "pulse/pipeline/pipeline.hpp"

namespace pulse {

// --- Pipeline ---

Pipeline::Pipeline(const std::string& name) : name_(name) {}

Pipeline& Pipeline::filter(std::function<bool(const Event&)> pred,
                            const std::string& name) {
    auto op = std::make_shared<FilterOperator>(std::move(pred), name);
    if (!operators_.empty()) {
        operators_.back()->set_downstream(op);
    }
    operators_.push_back(op);
    return *this;
}

Pipeline& Pipeline::map(std::function<Event(const Event&)> fn,
                         const std::string& name) {
    auto op = std::make_shared<MapOperator>(std::move(fn), name);
    if (!operators_.empty()) {
        operators_.back()->set_downstream(op);
    }
    operators_.push_back(op);
    return *this;
}

Pipeline& Pipeline::sink(std::function<void(const Event&)> fn,
                          const std::string& name) {
    auto op = std::make_shared<SinkOperator>(std::move(fn), name);
    if (!operators_.empty()) {
        operators_.back()->set_downstream(op);
    }
    operators_.push_back(op);
    return *this;
}

void Pipeline::process(const Event& event) {
    events_in_++;
    if (!operators_.empty()) {
        operators_.front()->process(event);
    }
}

void Pipeline::flush() {
    for (auto& op : operators_) {
        op->flush();
    }
}

std::vector<std::string> Pipeline::operator_names() const {
    std::vector<std::string> names;
    for (const auto& op : operators_) {
        names.push_back(op->name());
    }
    return names;
}

// --- PipelineBuilder ---

PipelineBuilder::PipelineBuilder(const std::string& name) : name_(name) {}

PipelineBuilder& PipelineBuilder::filter(std::function<bool(const Event&)> pred,
                                          const std::string& name) {
    OpSpec spec;
    spec.type = OpSpec::FILTER;
    spec.filter_fn = std::move(pred);
    spec.name = name;
    specs_.push_back(std::move(spec));
    return *this;
}

PipelineBuilder& PipelineBuilder::map(std::function<Event(const Event&)> fn,
                                       const std::string& name) {
    OpSpec spec;
    spec.type = OpSpec::MAP;
    spec.map_fn = std::move(fn);
    spec.name = name;
    specs_.push_back(std::move(spec));
    return *this;
}

PipelineBuilder& PipelineBuilder::sink(std::function<void(const Event&)> fn,
                                        const std::string& name) {
    OpSpec spec;
    spec.type = OpSpec::SINK;
    spec.sink_fn = std::move(fn);
    spec.name = name;
    specs_.push_back(std::move(spec));
    return *this;
}

Pipeline PipelineBuilder::build() {
    Pipeline pipeline(name_);
    for (auto& spec : specs_) {
        switch (spec.type) {
            case OpSpec::FILTER:
                pipeline.filter(std::move(spec.filter_fn), spec.name);
                break;
            case OpSpec::MAP:
                pipeline.map(std::move(spec.map_fn), spec.name);
                break;
            case OpSpec::SINK:
                pipeline.sink(std::move(spec.sink_fn), spec.name);
                break;
        }
    }
    return pipeline;
}

} // namespace pulse