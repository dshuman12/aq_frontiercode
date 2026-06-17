FROM gcc:14

RUN apt-get update && \
    apt-get install -y --no-install-recommends make python3 git patch clang-format && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/jsonschema

COPY repo/ .
COPY verifier-sh /usr/local/bin/sh

RUN chmod +x /usr/local/bin/sh && \
    mkdir -p /environment && \
    ln -s /testbed/jsonschema /environment/repo && \
    make configure compile

ENTRYPOINT []
