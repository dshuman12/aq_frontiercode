FROM gcc:13.3

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake=3.25.1-1 \
    make=4.3-4.1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/CryoGraph

COPY . .

RUN mkdir -p build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc)

ENTRYPOINT []