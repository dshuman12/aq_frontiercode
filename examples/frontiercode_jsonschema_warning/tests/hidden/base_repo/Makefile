CXX ?= c++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -Werror -pedantic

BUILD_DIR := build
BINARY := $(BUILD_DIR)/jsonschema-demo
SOURCES := src/main.cpp src/schema.cpp

.PHONY: all configure compile test clean

all: configure compile test

configure:
	mkdir -p $(BUILD_DIR)

compile: $(BINARY)

$(BINARY): $(SOURCES) src/logger.h src/schema.h | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -I. $(SOURCES) -o $(BINARY)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

test: compile
	./test/warning-output.sh $(BINARY)

clean:
	rm -rf $(BUILD_DIR)
