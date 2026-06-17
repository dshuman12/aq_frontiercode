FROM gcc:13.3

RUN apt-get update && \
    apt-get install -y --no-install-recommends cmake make python3 git patch && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/PulseEngine

COPY repo/ .

RUN mkdir -p /environment && \
    ln -s /testbed/PulseEngine /environment/repo && \
    mkdir -p build && \
    cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --parallel 2

ENTRYPOINT []
