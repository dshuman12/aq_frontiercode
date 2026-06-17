FROM gcc:13.3

RUN apt-get update && \
    apt-get install -y --no-install-recommends cmake make && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/PulseEngine

COPY . .

RUN mkdir -p build && \
    cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc)

ENTRYPOINT []